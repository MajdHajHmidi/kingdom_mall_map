import { Coordinate, getMapData, show3dMap } from "@mappedin/mappedin-js";
import './node_modules/@mappedin/mappedin-js/lib/index.css';

const defaultSpaceColor = '#f2efdc';
const defaultStoreColor = '#f0f0ee';
const hallwayColor = '#f2f2f2';
const markersForegroundColor = '#fafafa';
const interactivityColor = '#454544';
const navigationColor = '#fbda03';
const objectsColors = "#e3e3de";
const washroomsColor = "#dadee8";

let mapOptions;
let initialFloorId;

let mapData;
let mapView;
let defaultCameraPosition;

let mobileWebView;

let storesLogos = new Map();

// TODO: Temp code, remove when done testing
const storesFakeNames = new Map();

// 'storesLogosDictionary' is a map pairing every store id with the url of the store logo
// 'viewOnlyStoreId' is optinal, when not null, mapView will focus on it right away and map won't be interactive
window.init = async function init(mapKey, mapSecret, mapId, initialFloorIdValue, storesLogosDictionary, mobileWebViewValue, viewOnlyStoreId) {

  // TODO: Temp code, remove when done testing
  setFakeStoreNames();

  // Dependency Configuration
  configureDependencies(mapKey, mapSecret, mapId, initialFloorIdValue, storesLogosDictionary, mobileWebViewValue)

  // Emit loading state
  if (mobileWebView) {
    FlutterChannel.postMessage("loading");
  }

  try {
    // Instantiate map
    mapData = await getMapData(mapOptions);
    mapView = await show3dMap(
      document.getElementById("mappedin-map"),
      mapData,
      { initialFloor: initialFloorId, outdoorView: { enabled: false }, pitch: 0, }
    );

    // TODO: Temp code, remove when done testing
    addGrass()
    addStreets()
    addLakes()
    addBushes()
    addParkingMark()
    addParkingLot()

    if (viewOnlyStoreId) {
      setupLabelsAndInteractivity()
      if (mobileWebView) {
        FlutterChannel.postMessage("success");
      }
      await selectById(viewOnlyStoreId, true)
      return;
    }


    // Save default camera position to reset upon request later
    saveDefaultCameraPosition()

    // Setup main functionalities
    setupLabelsAndInteractivity();
    handleClickChanges();

    // Emit success state
    if (mobileWebView) {
      FlutterChannel.postMessage("success");
    }
  } catch (error) {
    // Emit error state
    if (mobileWebView) {
      FlutterChannel.postMessage("failure");
    }
  }
}

function configureDependencies(mapKey, mapSecret, mapId, initialFloorIdValue, storesLogosDictionary, mobileWebViewValue) {
  mapOptions = {
    key: mapKey,
    secret: mapSecret,
    mapId: mapId,
  };
  initialFloorId = initialFloorIdValue;
  mobileWebView = mobileWebViewValue;

  for (const [key, value] of Object.entries(storesLogosDictionary)) {
    storesLogos.set(key, value);
  }
}

function saveDefaultCameraPosition() {
  defaultCameraPosition = {
    bearing: mapView.Camera.bearing,
    pitch: mapView.Camera.pitch,
    zoomLevel: mapView.Camera.zoomLevel,
    center: mapData.mapCenter,
  };
}

function setupLabelsAndInteractivity() {
  mapData.getByType('space').forEach(space => {
    if (space.type == 'hallway') {
      mapView.updateState(space, {
        color: hallwayColor,
      });
    } else {
      if (space.name) {
        if (checkForWashroom(space.name)) {
          mapView.updateState(space, {
            color: washroomsColor,
          });
          return;
        }
        mapView.updateState(space, {
          interactive: true,
          hoverColor: interactivityColor,
          color: defaultStoreColor,
        });
        // TODO: Change back to original

        // ORIGINAL CODE BELOW
        // mapView.Labels.add(space, space.name, {}, {
        //   appearance: {
        //     text: {
        //       size: 14
        //     },
        //     marker: {
        //       // BELOW: Category icons (Changed to store logos instead)
        //       // icon: getIconFromCategory(storesCategories.get(space.id)),

        //       // BELOW: Logo icons
        //       icon: storesLogos.get(space.id),
        //       foregroundColor: {
        //         active: markersForegroundColor,
        //       },
        //       iconSize: 30
        //     }
        //   }
        // });

        // TEMP FAKE CODE BELOW
        mapView.Labels.add(space, storesFakeNames.get(space.id), {
          appearance: {
            text: {
              size: 14
            },
            marker: {
              // BELOW: Category icons (Changed to store logos instead)
              // icon: getIconFromCategory(storesCategories.get(space.id)),

              // BELOW: Logo icons
              icon: storesLogos.get(space.id),
              foregroundColor: {
                active: markersForegroundColor,
              },
              iconSize: 34
            }
          }
        });
      } else {
        mapView.updateState(space, {
          color: defaultSpaceColor
        });
      }
    }
  });

  // Change objects colors
  mapData.getByType('object').forEach((object) => {
    mapView.updateState(object, {
      color: objectsColors
    });
  });
}

async function handleClickChanges() {
  mapView.on('click', async (e) => {
    // TODO: Temp code, remove when done testing
    // if (e.models.length > 0) {
    //   // If a 3D Model was clicked on, remove it.
    //   mapView.Models.remove(e.models[0]);
    // } else {
    //   console.clear()
    //   console.log(e.coordinate)
    //   mapView.Models.add(
    //     {
    //       target: e.coordinate,
    //       scale: [0.05, 0.05, 0.05],
    //       rotation: [0, 0, 32.5],
    //       interactive: true,
    //     },
    //     {
    //       url: "./assets/models/parking.glb",
    //     }
    //   );
    // }

    // 1 Disable ability to click objects (not spaces)
    if (e.spaces.length == 0 || !e.spaces[0].name) {
      return;
    }

    // 2 Clear the color of all selected spaces if there are any
    mapData.getByType('space').forEach((space) => {
      if (space.name && space.type != 'hallway' && !checkForWashroom(space.name)) {
        mapView.updateState(space, {
          color: defaultStoreColor,
        });
      }
    });

    // 3 Change color of the clicked space
    toggleAmenities(false)
    removeAllDirections()
    const clickedSpace = e.spaces;
    mapView.updateState(clickedSpace[0], { color: interactivityColor });
    if (mobileWebView) {
      FlutterChannel.postMessage("store" + clickedSpace[0].id);
    }

    // 4 Zoom to the clicked space
    await mapView.Camera.focusOn(clickedSpace[0], {
      pitch: 1,
      duration: 500,
      maxZoomLevel: 20
    });
  });
}

// TODO: Temp code, remove when done testing
function setFakeStoreNames() {
  storesFakeNames.set('s_fa005f3d5fada368', 'مطعم البيك العائلي');
  storesFakeNames.set('s_310f7df34a3c6853', 'باتيك فيليب');
  storesFakeNames.set('s_5d2f5e3a61ba4fe4', 'زارا');
  storesFakeNames.set('s_75d2b2934fe2495f', 'مطعم القبطان');
  storesFakeNames.set('s_b6adb793f5040daf', 'برجر كنج');
  storesFakeNames.set('s_c4bbb9b22a85cf30', 'سي بي تو');
  storesFakeNames.set('s_c33647c792604ae1', 'متجر هومز مارت');
  storesFakeNames.set('s_58172f1247075c72', 'مفروشات ديموس');
  storesFakeNames.set('s_21b3ffc46583729a', 'نايكي');
  storesFakeNames.set('s_4f386ba681ebb61d', 'ماكدونلز');
  storesFakeNames.set('s_8b3aac9b4b9dc9ef', 'أديداس');
  storesFakeNames.set('s_d33e419c4bb801c0', 'دجاج كنتاكي');
  storesFakeNames.set('s_ca4c11f3a7bc82da', 'دومينوز بيتزا');
  storesFakeNames.set('s_6696afd32ac79ddb', 'ساب واي');
  storesFakeNames.set('s_57e2ffa7f48e2cb6', 'باسكن روبنز');
  storesFakeNames.set('s_429e0a876a1e4490', 'كالفن كلاين');
  storesFakeNames.set('s_45b97f4031d3ff2f', 'شانيل');
  storesFakeNames.set('s_037e1a9fa2cb8331', 'بوتيري بارن');
  storesFakeNames.set('s_b08905633a9d2000', 'مانغو');
  storesFakeNames.set('s_ba1781eaf91646e9', 'فانز');
  storesFakeNames.set('s_144702bf49e8c794', 'دايز');
  storesFakeNames.set('s_0b35e438d8b666f6', 'لاكوست');

  // storesFakeNames.set('s_fa005f3d5fada368', 'albik family station');
  // storesFakeNames.set('s_310f7df34a3c6853', 'Patek Philippe');
  // storesFakeNames.set('s_5d2f5e3a61ba4fe4', 'Zara');
  // storesFakeNames.set('s_75d2b2934fe2495f', 'Captain Restaurant');
  // storesFakeNames.set('s_b6adb793f5040daf', 'Burger King');
  // storesFakeNames.set('s_c4bbb9b22a85cf30', 'CB2');
  // storesFakeNames.set('s_c33647c792604ae1', 'HomsMart shop');
  // storesFakeNames.set('s_58172f1247075c72', 'Demos Furniture');
  // storesFakeNames.set('s_21b3ffc46583729a', 'Nike');
  // storesFakeNames.set('s_4f386ba681ebb61d', 'McDonald\'s');
  // storesFakeNames.set('s_8b3aac9b4b9dc9ef', 'Adids');
  // storesFakeNames.set('s_d33e419c4bb801c0', 'Kentucky Chicken');
  // storesFakeNames.set('s_ca4c11f3a7bc82da', 'Domino\'s Pizza');
  // storesFakeNames.set('s_6696afd32ac79ddb', 'Subway');
  // storesFakeNames.set('s_57e2ffa7f48e2cb6', 'Baskin Robbins');
  // storesFakeNames.set('s_429e0a876a1e4490', 'Calvin Clein');
  // storesFakeNames.set('s_45b97f4031d3ff2f', 'Chanel');
  // storesFakeNames.set('s_037e1a9fa2cb8331', 'Pottery Barn');
  // storesFakeNames.set('s_b08905633a9d2000', 'Mango');
  // storesFakeNames.set('s_ba1781eaf91646e9', 'Vans');
  // storesFakeNames.set('s_144702bf49e8c794', 'Daze');
  // storesFakeNames.set('s_0b35e438d8b666f6', 'LACOSTE');
}

// TODO: Temp code, remove when done testing
function addGrass() {
  let grassList = []
  // const smallScale = [2, 2, 0.2]
  const verticalScale = [2, 6, 0.2]
  const horizontalScale = [6, 2, 0.2]
  const hugeScale = [9, 9, 0.2]
  const extraVerticalScale = [2, 90, 0.2]
  const extraHorizontalScale = [90, 2, 0.2]
  const extraHuge = [13, 13, 0.2]

  // Vertical scale
  grassList.push({ latitude: 43.46337725507896, longitude: -80.52349801489295, type: 'vertical' })
  grassList.push({ latitude: 43.463420388000024, longitude: -80.52353594045489, type: 'vertical' })
  grassList.push({ latitude: 43.46345433450374, longitude: -80.52356566843449, type: 'vertical' })
  grassList.push({ latitude: 43.46350311137146, longitude: -80.52358056164339, type: 'vertical' })
  grassList.push({ latitude: 43.46353788871422, longitude: -80.52361120083361, type: 'vertical' })
  grassList.push({ latitude: 43.46356430808192, longitude: -80.5236344213029, type: 'vertical' })
  grassList.push({ latitude: 43.46350365169991, longitude: -80.52381226933755, type: 'vertical' })
  grassList.push({ latitude: 43.46346881217583, longitude: -80.52388519375074, type: 'vertical' })
  grassList.push({ latitude: 43.46349277796884, longitude: -80.52399318226205, type: 'vertical' })
  grassList.push({ latitude: 43.463411852864056, longitude: -80.5241407187603, type: 'vertical' })
  grassList.push({ latitude: 43.46336846649207, longitude: -80.52410262293701, type: 'vertical' })
  grassList.push({ latitude: 43.46332459867355, longitude: -80.52406414081271, type: 'vertical' })
  grassList.push({ latitude: 43.463280848117016, longitude: -80.52402576167385, type: 'vertical' })
  grassList.push({ latitude: 43.46326882594579, longitude: -80.52392137311892, type: 'vertical' })
  grassList.push({ latitude: 43.463223742683766, longitude: -80.52388181698885, type: 'vertical' })
  grassList.push({ latitude: 43.4631791562947, longitude: -80.52384271775216, type: 'vertical' })
  grassList.push({ latitude: 43.463134880695634, longitude: -80.52380387359307, type: 'vertical' })
  grassList.push({ latitude: 43.46309143582625, longitude: -80.52376575473438, type: 'vertical' })
  grassList.push({ latitude: 43.463047161299514, longitude: -80.52372691903909, type: 'vertical' })
  grassList.push({ latitude: 43.46311488664375, longitude: -80.52345973950322, type: 'vertical' })
  grassList.push({ latitude: 43.46323676299989, longitude: -80.52316737498485, type: 'vertical' })
  grassList.push({ latitude: 43.4634094312466, longitude: -80.52291795567072, type: 'vertical' })
  grassList.push({ latitude: 43.46345401346885, longitude: -80.52295718475206, type: 'vertical' })
  grassList.push({ latitude: 43.46349901411974, longitude: -80.52299674114718, type: 'vertical' })
  grassList.push({ latitude: 43.463544070300195, longitude: -80.52303611411337, type: 'vertical' })
  grassList.push({ latitude: 43.46358893132539, longitude: -80.52307555269715, type: 'vertical' })
  grassList.push({ latitude: 43.46343740440643, longitude: -80.52337783501451, type: 'vertical' })
  grassList.push({ latitude: 43.46349142256315, longitude: -80.52390521550234, type: 'vertical' })
  grassList.push({ latitude: 43.463111943578326, longitude: -80.52346555413865, type: 'vertical' })
  grassList.push({ latitude: 43.46309953213987, longitude: -80.52344550836057, type: 'vertical' })
  grassList.push({ latitude: 43.46306860643118, longitude: -80.52342673803246, type: 'vertical' })
  grassList.push({ latitude: 43.46302405886649, longitude: -80.52338767123508, type: 'vertical' })
  grassList.push({ latitude: 43.46297905599498, longitude: -80.52334804296562, type: 'vertical' })
  grassList.push({ latitude: 43.46294455108113, longitude: -80.52331785643419, type: 'vertical' })
  grassList.push({ latitude: 43.46291818600628, longitude: -80.52329463015714, type: 'vertical' })
  grassList.push({ latitude: 43.46307227780645, longitude: -80.52353257865148, type: 'vertical' })
  grassList.push({ latitude: 43.463033889286955, longitude: -80.52349896480341, type: 'vertical' })
  grassList.push({ latitude: 43.46298983309232, longitude: -80.52346028840097, type: 'vertical' })
  grassList.push({ latitude: 43.462945499243716, longitude: -80.52342138764435, type: 'vertical' })
  grassList.push({ latitude: 43.46290064576737, longitude: -80.52338207982523, type: 'vertical' })
  grassList.push({ latitude: 43.46288432053909, longitude: -80.52336754188701, type: 'vertical' })
  grassList.push({ latitude: 43.46351289563845, longitude: -80.52392311904718, type: 'vertical' })
  grassList.push({ latitude: 43.463553231059414, longitude: -80.52395846159875, type: 'vertical' })
  grassList.push({ latitude: 43.46356450621415, longitude: -80.52396839880376, type: 'vertical' })
  grassList.push({ latitude: 43.46363743491274, longitude: -80.52392969179921, type: 'vertical' })
  grassList.push({ latitude: 43.46403830858303, longitude: -80.5229807467769, type: 'vertical' })
  grassList.push({ latitude: 43.464083276772854, longitude: -80.52302017525011, type: 'vertical' })
  grassList.push({ latitude: 43.464126552158106, longitude: -80.52305820759503, type: 'vertical' })
  grassList.push({ latitude: 43.46415728454612, longitude: -80.5230851394097, type: 'vertical' })
  grassList.push({ latitude: 43.46348537285801, longitude: -80.52452399504034, type: 'vertical' })
  grassList.push({ latitude: 43.46344301957325, longitude: -80.52448659272673, type: 'vertical' })
  grassList.push({ latitude: 43.46268156488573, longitude: -80.52381623385808, type: 'vertical' })
  grassList.push({ latitude: 43.463547698701056, longitude: -80.52385074569499, type: 'vertical' })
  grassList.push({ latitude: 43.46363122379445, longitude: -80.52392407490808, type: 'vertical' })
  grassList.push({ latitude: 43.463745099678434, longitude: -80.52367947271037, type: 'vertical' })
  grassList.push({ latitude: 43.46377711998998, longitude: -80.52370770309291, type: 'vertical' })
  grassList.push({ latitude: 43.46366095811636, longitude: -80.52360656817073, type: 'vertical' })
  grassList.push({ latitude: 43.46361623882898, longitude: -80.5235670947582, type: 'vertical' })
  grassList.push({ latitude: 43.463570926303646, longitude: -80.52352717085145, type: 'vertical' })
  grassList.push({ latitude: 43.46352554633576, longitude: -80.52348740810653, type: 'vertical' })
  grassList.push({ latitude: 43.46349966065435, longitude: -80.52346476680782, type: 'vertical' })
  grassList.push({ latitude: 43.464039011832206, longitude: -80.52313725287038, type: 'vertical' })
  grassList.push({ latitude: 43.46399437547047, longitude: -80.52309793784418, type: 'vertical' })
  grassList.push({ latitude: 43.46394999708614, longitude: -80.5230591992707, type: 'vertical' })
  grassList.push({ latitude: 43.463907224858254, longitude: -80.52302157407546, type: 'vertical' })
  grassList.push({ latitude: 43.46386297619326, longitude: -80.52298293459361, type: 'vertical' })
  grassList.push({ latitude: 43.46381850517251, longitude: -80.52294376881528, type: 'vertical' })
  grassList.push({ latitude: 43.46377442307619, longitude: -80.52290495907225, type: 'vertical' })
  grassList.push({ latitude: 43.463245987289824, longitude: -80.52392453167779, type: 'vertical' })
  grassList.push({ latitude: 43.46320336974882, longitude: -80.52388808776426, type: 'vertical' })
  grassList.push({ latitude: 43.46315923298473, longitude: -80.52384977391375, type: 'vertical' })
  grassList.push({ latitude: 43.46311570341332, longitude: -80.52381216680753, type: 'vertical' })
  grassList.push({ latitude: 43.463072195049605, longitude: -80.52377412136057, type: 'vertical' })
  grassList.push({ latitude: 43.463030951765624, longitude: -80.52373902240689, type: 'vertical' })
  grassList.push({ latitude: 43.463212290716605, longitude: -80.52394601396401, type: 'vertical' })
  grassList.push({ latitude: 43.463241519974844, longitude: -80.52396885648294, type: 'vertical' })
  grassList.push({ latitude: 43.46324718983777, longitude: -80.52394833732437, type: 'vertical' })
  grassList.push({ latitude: 43.46320468685938, longitude: -80.52391225591855, type: 'vertical' })
  grassList.push({ latitude: 43.46317342167979, longitude: -80.52390206361765, type: 'vertical' })
  grassList.push({ latitude: 43.46312967448336, longitude: -80.5238635577434, type: 'vertical' })
  grassList.push({ latitude: 43.46309102028542, longitude: -80.52382966689542, type: 'vertical' })
  grassList.push({ latitude: 43.46304744785908, longitude: -80.52379138576877, type: 'vertical' })
  grassList.push({ latitude: 43.46300905344864, longitude: -80.52375771306767, type: 'vertical' })
  grassList.push({ latitude: 43.46301733093709, longitude: -80.52374470633059, type: 'vertical' })
  grassList.push({ latitude: 43.46305871331574, longitude: -80.5237816652585, type: 'vertical' })
  grassList.push({ latitude: 43.46310272329444, longitude: -80.52382080331543, type: 'vertical' })
  grassList.push({ latitude: 43.46314515889568, longitude: -80.52385699857234, type: 'vertical' })
  grassList.push({ latitude: 43.463176497134015, longitude: -80.52388368552374, type: 'vertical' })
  grassList.push({ latitude: 43.46308083560971, longitude: -80.52411141304248, type: 'vertical' })
  grassList.push({ latitude: 43.46303592234675, longitude: -80.52407193874976, type: 'vertical' })
  grassList.push({ latitude: 43.462990935115016, longitude: -80.52403241036878, type: 'vertical' })
  grassList.push({ latitude: 43.46295103180919, longitude: -80.52399747136342, type: 'vertical' })
  grassList.push({ latitude: 43.46290643524037, longitude: -80.52395805730845, type: 'vertical' })
  grassList.push({ latitude: 43.4628615490732, longitude: -80.52391860785302, type: 'vertical' })
  grassList.push({ latitude: 43.462817556960715, longitude: -80.52388009221838, type: 'vertical' })
  grassList.push({ latitude: 43.46277590072303, longitude: -80.52384351498871, type: 'vertical' })
  grassList.push({ latitude: 43.46275025946622, longitude: -80.52382211816692, type: 'vertical' })
  grassList.push({ latitude: 43.46276098733139, longitude: -80.52385759516767, type: 'vertical' })
  grassList.push({ latitude: 43.462806269622966, longitude: -80.52389718875285, type: 'vertical' })
  grassList.push({ latitude: 43.46285107224685, longitude: -80.5239386514778, type: 'vertical' })
  grassList.push({ latitude: 43.46289448269482, longitude: -80.52397639973071, type: 'vertical' })
  grassList.push({ latitude: 43.46293631090196, longitude: -80.52401095805467, type: 'vertical' })
  grassList.push({ latitude: 43.46297880024867, longitude: -80.52404925469483, type: 'vertical' })
  grassList.push({ latitude: 43.46302161249616, longitude: -80.52408841285478, type: 'vertical' })
  grassList.push({ latitude: 43.46306617847934, longitude: -80.52412565804977, type: 'vertical' })

  // Horizontal scale
  grassList.push({ latitude: 43.46338354748157, longitude: -80.52344700472375, type: 'horizontal' })
  grassList.push({ latitude: 43.46340588307954, longitude: -80.52339887531099, type: 'horizontal' })
  grassList.push({ latitude: 43.46347611176505, longitude: -80.5233809226043, type: 'horizontal' })
  grassList.push({ latitude: 43.463504339716536, longitude: -80.5233199243514, type: 'horizontal' })
  grassList.push({ latitude: 43.46353257730305, longitude: -80.52325894498149, type: 'horizontal' })
  grassList.push({ latitude: 43.46356117367888, longitude: -80.5231970993725, type: 'horizontal' })
  grassList.push({ latitude: 43.46359005460807, longitude: -80.52313453005257, type: 'horizontal' })
  grassList.push({ latitude: 43.46336850950604, longitude: -80.52292643452783, type: 'horizontal' })
  grassList.push({ latitude: 43.463340288372414, longitude: -80.522987621535, type: 'horizontal' })
  grassList.push({ latitude: 43.46331136231456, longitude: -80.52304993883959, type: 'horizontal' })
  grassList.push({ latitude: 43.463283065729605, longitude: -80.52311118283791, type: 'horizontal' })
  grassList.push({ latitude: 43.46326704687523, longitude: -80.52314585306796, type: 'horizontal' })
  grassList.push({ latitude: 43.46320014960246, longitude: -80.523182189927, type: 'horizontal' })
  grassList.push({ latitude: 43.46317177649553, longitude: -80.5232434028269, type: 'horizontal' })
  grassList.push({ latitude: 43.46314384804083, longitude: -80.52330364431523, type: 'horizontal' })
  grassList.push({ latitude: 43.463115394138114, longitude: -80.52336502888197, type: 'horizontal' })
  grassList.push({ latitude: 43.463093563970205, longitude: -80.52341223962887, type: 'horizontal' })
  grassList.push({ latitude: 43.46308441685531, longitude: -80.52357288623094, type: 'horizontal' })
  grassList.push({ latitude: 43.46305717038227, longitude: -80.52363202675909, type: 'horizontal' })
  grassList.push({ latitude: 43.463032739712666, longitude: -80.52368485121195, type: 'horizontal' })
  grassList.push({ latitude: 43.46344437974188, longitude: -80.52412095732637, type: 'horizontal' })
  grassList.push({ latitude: 43.46346787512299, longitude: -80.52407045394938, type: 'horizontal' })
  grassList.push({ latitude: 43.4634850328531, longitude: -80.52403316012142, type: 'horizontal' })
  grassList.push({ latitude: 43.46349284386873, longitude: -80.52394819863464, type: 'horizontal' })
  grassList.push({ latitude: 43.46351613105538, longitude: -80.52378458230496, type: 'horizontal' })
  grassList.push({ latitude: 43.463540633746675, longitude: -80.52373153672633, type: 'horizontal' })
  grassList.push({ latitude: 43.46356564593269, longitude: -80.52367753843689, type: 'horizontal' })
  grassList.push({ latitude: 43.46356199393117, longitude: -80.52401972172555, type: 'horizontal' })
  grassList.push({ latitude: 43.46353306519473, longitude: -80.52408211314128, type: 'horizontal' })
  grassList.push({ latitude: 43.463504224197685, longitude: -80.52414456405229, type: 'horizontal' })
  grassList.push({ latitude: 43.463475732795715, longitude: -80.52420609700917, type: 'horizontal' })
  grassList.push({ latitude: 43.46344765294831, longitude: -80.52426676121141, type: 'horizontal' })
  grassList.push({ latitude: 43.46341962852855, longitude: -80.52432744127864, type: 'horizontal' })
  grassList.push({ latitude: 43.46340263456305, longitude: -80.52436415959575, type: 'horizontal' })
  grassList.push({ latitude: 43.46338417939546, longitude: -80.52440435044345, type: 'horizontal' })
  grassList.push({ latitude: 43.46365822743737, longitude: -80.52397143333886, type: 'horizontal' })
  grassList.push({ latitude: 43.46363056295525, longitude: -80.52403119093707, type: 'horizontal' })
  grassList.push({ latitude: 43.463601851341465, longitude: -80.52409325434134, type: 'horizontal' })
  grassList.push({ latitude: 43.46357333225703, longitude: -80.52415521506565, type: 'horizontal' })
  grassList.push({ latitude: 43.46354543455287, longitude: -80.52421579400489, type: 'horizontal' })
  grassList.push({ latitude: 43.46351647793552, longitude: -80.52427836276179, type: 'horizontal' })
  grassList.push({ latitude: 43.46348767332036, longitude: -80.52434060787823, type: 'horizontal' })
  grassList.push({ latitude: 43.46345887453051, longitude: -80.52440281598783, type: 'horizontal' })
  grassList.push({ latitude: 43.463436786658285, longitude: -80.5244504916018, type: 'horizontal' })
  grassList.push({ latitude: 43.463726888693905, longitude: -80.52406059943786, type: 'horizontal' })
  grassList.push({ latitude: 43.463699341237756, longitude: -80.52412020616558, type: 'horizontal' })
  grassList.push({ latitude: 43.463672643169474, longitude: -80.52417838053077, type: 'horizontal' })
  grassList.push({ latitude: 43.46364451497565, longitude: -80.5242392129284, type: 'horizontal' })
  grassList.push({ latitude: 43.463616752433694, longitude: -80.5242993489462, type: 'horizontal' })
  grassList.push({ latitude: 43.4635889993285, longitude: -80.52435899578518, type: 'horizontal' })
  grassList.push({ latitude: 43.463560746622775, longitude: -80.52442040075802, type: 'horizontal' })
  grassList.push({ latitude: 43.46353630314111, longitude: -80.5244733260697, type: 'horizontal' })
  grassList.push({ latitude: 43.463514683280046, longitude: -80.52452031419024, type: 'horizontal' })
  grassList.push({ latitude: 43.46285091678956, longitude: -80.52339375035383, type: 'horizontal' })
  grassList.push({ latitude: 43.46282243271351, longitude: -80.52345511358607, type: 'horizontal' })
  grassList.push({ latitude: 43.462793867176664, longitude: -80.52351666164998, type: 'horizontal' })
  grassList.push({ latitude: 43.4627653330147, longitude: -80.52357812822108, type: 'horizontal' })
  grassList.push({ latitude: 43.46273754894027, longitude: -80.52363803816253, type: 'horizontal' })
  grassList.push({ latitude: 43.4627098386612, longitude: -80.52369838527247, type: 'horizontal' })
  grassList.push({ latitude: 43.462689942663765, longitude: -80.5237413667691, type: 'horizontal' })
  grassList.push({ latitude: 43.46267232536163, longitude: -80.52377898552822, type: 'horizontal' })
  grassList.push({ latitude: 43.46326305007754, longitude: -80.52397368118802, type: 'horizontal' })
  grassList.push({ latitude: 43.46363453788578, longitude: -80.52387115758319, type: 'horizontal' })
  grassList.push({ latitude: 43.46366344422965, longitude: -80.5238085313637, type: 'horizontal' })
  grassList.push({ latitude: 43.46369168055496, longitude: -80.5237474783456, type: 'horizontal' })
  grassList.push({ latitude: 43.463707440554934, longitude: -80.52371323613431, type: 'horizontal' })
  grassList.push({ latitude: 43.46371988133353, longitude: -80.52368667957298, type: 'horizontal' })
  grassList.push({ latitude: 43.463581459631456, longitude: -80.52382383344877, type: 'horizontal' })
  grassList.push({ latitude: 43.46361029256736, longitude: -80.52376163776245, type: 'horizontal' })
  grassList.push({ latitude: 43.463638987609166, longitude: -80.52369995765729, type: 'horizontal' })
  grassList.push({ latitude: 43.46366542294506, longitude: -80.5236432429683, type: 'horizontal' })
  grassList.push({ latitude: 43.46350735718972, longitude: -80.52341321558306, type: 'horizontal' })
  grassList.push({ latitude: 43.46353621891552, longitude: -80.52335062873203, type: 'horizontal' })
  grassList.push({ latitude: 43.46356502052669, longitude: -80.52328810337718, type: 'horizontal' })
  grassList.push({ latitude: 43.46359403079489, longitude: -80.52322540615152, type: 'horizontal' })
  grassList.push({ latitude: 43.46362228085613, longitude: -80.52316429459299, type: 'horizontal' })
  grassList.push({ latitude: 43.4636505484701, longitude: -80.52310321036161, type: 'horizontal' })
  grassList.push({ latitude: 43.46367957038668, longitude: -80.52304081447728, type: 'horizontal' })
  grassList.push({ latitude: 43.46370819484557, longitude: -80.5229788490353, type: 'horizontal' })
  grassList.push({ latitude: 43.46372393451954, longitude: -80.52294522695813, type: 'horizontal' })
  grassList.push({ latitude: 43.46374191399502, longitude: -80.52290609991496, type: 'horizontal' })
  grassList.push({ latitude: 43.4638064876651, longitude: -80.52370408188203, type: 'horizontal' })
  grassList.push({ latitude: 43.463835189230174, longitude: -80.52364180132008, type: 'horizontal' })
  grassList.push({ latitude: 43.463863264302816, longitude: -80.52358092519525, type: 'horizontal' })
  grassList.push({ latitude: 43.463891909976525, longitude: -80.52351880025098, type: 'horizontal' })
  grassList.push({ latitude: 43.4639208628962, longitude: -80.52345633014593, type: 'horizontal' })
  grassList.push({ latitude: 43.463949222268646, longitude: -80.52339495530958, type: 'horizontal' })
  grassList.push({ latitude: 43.463977295818545, longitude: -80.52333435166263, type: 'horizontal' })
  grassList.push({ latitude: 43.464006020587625, longitude: -80.52327231239535, type: 'horizontal' })
  grassList.push({ latitude: 43.46403483134501, longitude: -80.52321005365815, type: 'horizontal' })
  grassList.push({ latitude: 43.4640511392084, longitude: -80.52317510234036, type: 'horizontal' })
  grassList.push({ latitude: 43.4635064371081, longitude: -80.52396294208671, type: 'horizontal' })
  grassList.push({ latitude: 43.46351982671544, longitude: -80.52397169346828, type: 'horizontal' })
  grassList.push({ latitude: 43.46352940832935, longitude: -80.52399593294014, type: 'horizontal' })
  grassList.push({ latitude: 43.46354063755302, longitude: -80.5240056238766, type: 'horizontal' })
  grassList.push({ latitude: 43.46355088811902, longitude: -80.52401465406822, type: 'horizontal' })
  grassList.push({ latitude: 43.46349761799646, longitude: -80.52404875890478, type: 'horizontal' })
  grassList.push({ latitude: 43.46346943689157, longitude: -80.52411208596472, type: 'horizontal' })
  grassList.push({ latitude: 43.463510925685505, longitude: -80.52406260375808, type: 'horizontal' })
  grassList.push({ latitude: 43.463451198708, longitude: -80.52415159909941, type: 'horizontal' })
  grassList.push({ latitude: 43.46348276965338, longitude: -80.52412386772465, type: 'horizontal' })
  grassList.push({ latitude: 43.46346560039617, longitude: -80.5241638391726, type: 'horizontal' })
  grassList.push({ latitude: 43.46352205810661, longitude: -80.5240737215474, type: 'horizontal' })
  grassList.push({ latitude: 43.46349295430441, longitude: -80.52412903144095, type: 'horizontal' })
  grassList.push({ latitude: 43.46347488520337, longitude: -80.52417128583402, type: 'horizontal' })
  grassList.push({ latitude: 43.46349753832149, longitude: -80.52337219955008, type: 'horizontal' })
  grassList.push({ latitude: 43.463526114583495, longitude: -80.52331179395392, type: 'horizontal' })
  grassList.push({ latitude: 43.46355238574656, longitude: -80.523251828889, type: 'horizontal' })
  grassList.push({ latitude: 43.46357954321246, longitude: -80.52319311670966, type: 'horizontal' })
  grassList.push({ latitude: 43.463606239786145, longitude: -80.52312849192798, type: 'horizontal' })
  grassList.push({ latitude: 43.46350569455316, longitude: -80.52338649796619, type: 'horizontal' })
  grassList.push({ latitude: 43.463533978784085, longitude: -80.52332420806066, type: 'horizontal' })
  grassList.push({ latitude: 43.463560979573316, longitude: -80.52326616342386, type: 'horizontal' })
  grassList.push({ latitude: 43.46358913167285, longitude: -80.52320537889831, type: 'horizontal' })
  grassList.push({ latitude: 43.46361576485897, longitude: -80.5231427633438, type: 'horizontal' })
  grassList.push({ latitude: 43.463215850946334, longitude: -80.52263603396919, type: 'horizontal' })
  grassList.push({ latitude: 43.46318733608947, longitude: -80.52269784320282, type: 'horizontal' })
  grassList.push({ latitude: 43.463161439853835, longitude: -80.52275414080115, type: 'horizontal' })
  grassList.push({ latitude: 43.46313330509054, longitude: -80.52281518730226, type: 'horizontal' })
  grassList.push({ latitude: 43.46310867282901, longitude: -80.52286835698766, type: 'horizontal' })

  // Huge scale
  grassList.push({ latitude: 43.46349001248668, longitude: -80.52445001916928, type: 'huge' })
  grassList.push({ latitude: 43.463530548832004, longitude: -80.52435902964132, type: 'huge' })
  grassList.push({ latitude: 43.46357469171849, longitude: -80.52426689597213, type: 'huge' })
  grassList.push({ latitude: 43.46362017297924, longitude: -80.524180175516, type: 'huge' })
  grassList.push({ latitude: 43.46365687335464, longitude: -80.52409214778625, type: 'huge' })
  grassList.push({ latitude: 43.46369935662743, longitude: -80.52399771036477, type: 'huge' })
  grassList.push({ latitude: 43.46367722991675, longitude: -80.52389255404755, type: 'huge' })
  grassList.push({ latitude: 43.46370823321535, longitude: -80.52383118079246, type: 'huge' })
  grassList.push({ latitude: 43.4637457442725, longitude: -80.52375229823615, type: 'huge' })
  grassList.push({ latitude: 43.46374989787978, longitude: -80.52391054661648, type: 'huge' })
  grassList.push({ latitude: 43.463789940118, longitude: -80.52382465337529, type: 'huge' })
  grassList.push({ latitude: 43.46383243618645, longitude: -80.5237359961906, type: 'huge' })
  grassList.push({ latitude: 43.46387742000932, longitude: -80.52364725358022, type: 'huge' })
  grassList.push({ latitude: 43.4639188798064, longitude: -80.5235593113445, type: 'huge' })
  grassList.push({ latitude: 43.463964083240086, longitude: -80.52346634342186, type: 'huge' })
  grassList.push({ latitude: 43.464006262993166, longitude: -80.52337411862902, type: 'huge' })
  grassList.push({ latitude: 43.46404383964706, longitude: -80.52327806851895, type: 'huge' })
  grassList.push({ latitude: 43.464090849778174, longitude: -80.52318801512396, type: 'huge' })
  grassList.push({ latitude: 43.46411718124751, longitude: -80.52312686910246, type: 'huge' })
  grassList.push({ latitude: 43.4640556708904, longitude: -80.52307431783608, type: 'huge' })
  grassList.push({ latitude: 43.4639935926184, longitude: -80.52302125469545, type: 'huge' })
  grassList.push({ latitude: 43.46393009514298, longitude: -80.5229652146192, type: 'huge' })
  grassList.push({ latitude: 43.4638667566091, longitude: -80.522908466861, type: 'huge' })
  grassList.push({ latitude: 43.46380351779649, longitude: -80.52285394620719, type: 'huge' })
  grassList.push({ latitude: 43.4635548390973, longitude: -80.52378575674753, type: 'huge' })
  grassList.push({ latitude: 43.46358979776122, longitude: -80.52370843187327, type: 'huge' })
  grassList.push({ latitude: 43.46362334250132, longitude: -80.52362572738818, type: 'huge' })
  grassList.push({ latitude: 43.463554146938456, longitude: -80.5235718772302, type: 'huge' })
  grassList.push({ latitude: 43.46349137247562, longitude: -80.52351852947632, type: 'huge' })
  grassList.push({ latitude: 43.463421245255766, longitude: -80.52348339378231, type: 'huge' })
  grassList.push({ latitude: 43.46344188381414, longitude: -80.52342968096065, type: 'huge' })
  grassList.push({ latitude: 43.46279518151757, longitude: -80.52365014052836, type: 'huge' })
  grassList.push({ latitude: 43.46275211371453, longitude: -80.52374283987753, type: 'huge' })
  grassList.push({ latitude: 43.46278391993209, longitude: -80.52363873194686, type: 'huge' })
  grassList.push({ latitude: 43.462744723996686, longitude: -80.52372333946596, type: 'huge' })
  grassList.push({ latitude: 43.46271846042815, longitude: -80.52378241286404, type: 'huge' })
  grassList.push({ latitude: 43.46332949420233, longitude: -80.52291718305345, type: 'huge' })
  grassList.push({ latitude: 43.46328930414219, longitude: -80.52300263540775, type: 'huge' })
  grassList.push({ latitude: 43.46323599847816, longitude: -80.52308738047296, type: 'huge' })
  grassList.push({ latitude: 43.46393426725448, longitude: -80.52351003934058, type: 'huge' })

  // Extra Vertical scale
  grassList.push({ latitude: 43.46304074595203, longitude: -80.52413146612061, type: 'exVertical' })
  grassList.push({ latitude: 43.463677108144076, longitude: -80.5226637723372, type: 'exVertical' })

  // Extra Horizontal scale
  grassList.push({ latitude: 43.463117467525755, longitude: -80.5228183004146, type: 'exHorizontal' })
  grassList.push({ latitude: 43.46395726456525, longitude: -80.52356256878596, type: 'exHorizontal' })

  // Extra Huge
  grassList.push({ latitude: 43.46372150476877, longitude: -80.52281075751301, type: 'exHuge' })
  grassList.push({ latitude: 43.463627354919765, longitude: -80.5227297351458, type: 'exHuge' })
  grassList.push({ latitude: 43.46353257272784, longitude: -80.52264158458274, type: 'exHuge' })
  grassList.push({ latitude: 43.46343753625278, longitude: -80.522562004736, type: 'exHuge' })
  grassList.push({ latitude: 43.46335092743754, longitude: -80.5224859373033, type: 'exHuge' })
  grassList.push({ latitude: 43.46365047097811, longitude: -80.52293932321162, type: 'exHuge' })
  grassList.push({ latitude: 43.46355585490684, longitude: -80.5228488046093, type: 'exHuge' })
  grassList.push({ latitude: 43.46346916813342, longitude: -80.5227689025388, type: 'exHuge' })
  grassList.push({ latitude: 43.46338804200374, longitude: -80.52265558512444, type: 'exHuge' })
  grassList.push({ latitude: 43.46330013273426, longitude: -80.52257838507596, type: 'exHuge' })
  grassList.push({ latitude: 43.46361852874255, longitude: -80.52301138262777, type: 'exHuge' })
  grassList.push({ latitude: 43.4635280445078, longitude: -80.52292114054661, type: 'exHuge' })
  grassList.push({ latitude: 43.46344699658048, longitude: -80.5228700905709, type: 'exHuge' })
  grassList.push({ latitude: 43.46339556499773, longitude: -80.52282016839094, type: 'exHuge' })
  grassList.push({ latitude: 43.463107332530036, longitude: -80.52299028289318, type: 'exHuge' })
  grassList.push({ latitude: 43.46305105960248, longitude: -80.52313025067328, type: 'exHuge' })
  grassList.push({ latitude: 43.46299460589953, longitude: -80.52325313652396, type: 'exHuge' })
  grassList.push({ latitude: 43.46306909148534, longitude: -80.52332384826377, type: 'exHuge' })
  grassList.push({ latitude: 43.46313492333335, longitude: -80.52319211727269, type: 'exHuge' })
  grassList.push({ latitude: 43.46318977000141, longitude: -80.52306258311138, type: 'exHuge' })
  grassList.push({ latitude: 43.462891244117515, longitude: -80.52347782368112, type: 'exHuge' })
  grassList.push({ latitude: 43.46295332608566, longitude: -80.52353256562287, type: 'exHuge' })
  grassList.push({ latitude: 43.46300527281984, longitude: -80.52357795792003, type: 'exHuge' })
  grassList.push({ latitude: 43.4629734764652, longitude: -80.52364541524813, type: 'exHuge' })
  grassList.push({ latitude: 43.462878174510756, longitude: -80.52356146869258, type: 'exHuge' })
  grassList.push({ latitude: 43.4628596110302, longitude: -80.52354533619966, type: 'exHuge' })
  grassList.push({ latitude: 43.46335481716206, longitude: -80.524299644936, type: 'exHuge' })
  grassList.push({ latitude: 43.463395907297695, longitude: -80.5242112960211, type: 'exHuge' })
  grassList.push({ latitude: 43.46325290917077, longitude: -80.52423356646885, type: 'exHuge' })
  grassList.push({ latitude: 43.4632943721975, longitude: -80.52414476093645, type: 'exHuge' })
  grassList.push({ latitude: 43.463161889699336, longitude: -80.52413556105826, type: 'exHuge' })
  grassList.push({ latitude: 43.46320611246892, longitude: -80.52404019776516, type: 'exHuge' })
  grassList.push({ latitude: 43.463109830942365, longitude: -80.52395030668976, type: 'exHuge' })
  grassList.push({ latitude: 43.463070004656615, longitude: -80.52403444778528, type: 'exHuge' })
  grassList.push({ latitude: 43.46301802207215, longitude: -80.52386023941413, type: 'exHuge' })
  grassList.push({ latitude: 43.462985560085805, longitude: -80.52393342591269, type: 'exHuge' })
  grassList.push({ latitude: 43.462923783472654, longitude: -80.52378068598539, type: 'exHuge' })
  grassList.push({ latitude: 43.46288340285912, longitude: -80.52385995202374, type: 'exHuge' })
  grassList.push({ latitude: 43.46285122330094, longitude: -80.52371643225636, type: 'exHuge' })
  grassList.push({ latitude: 43.46280916933822, longitude: -80.5237929377837, type: 'exHuge' })
  grassList.push({ latitude: 43.46323173161292, longitude: -80.52290983721247, type: 'exHuge' })
  grassList.push({ latitude: 43.46316924202207, longitude: -80.52286684337092, type: 'exHuge' })
  grassList.push({ latitude: 43.463236731380505, longitude: -80.52273931286723, type: 'exHuge' })
  grassList.push({ latitude: 43.46330715434286, longitude: -80.52279274864888, type: 'exHuge' })
  grassList.push({ latitude: 43.463336163324165, longitude: -80.52271928118141, type: 'exHuge' })
  grassList.push({ latitude: 43.4632620784687, longitude: -80.52264733190879, type: 'exHuge' })

  // Extra Huge Diagonal
  // grassList.push({ latitude: 43.46396367027718, longitude: -80.52334613325488, type: 'exDgHuge' })
  // grassList.push({ latitude: 43.46393881538468, longitude: -80.52319100607046, type: 'exDgHuge' })
  // grassList.push({ latitude: 43.46391795838668, longitude: -80.52306350746873, type: 'exDgHuge' })
  // grassList.push({ latitude: 43.46391107355239, longitude: -80.5230199849701, type: 'exDgHuge' })
  // grassList.push({ latitude: 43.464026005561486, longitude: -80.52316547764643, type: 'exDgHuge' })

  grassList.forEach((coordinate) => {
    if (coordinate.type == 'vertical') {
      mapView.Models.add(
        {
          target: new Coordinate(coordinate.latitude, coordinate.longitude),
          scale: verticalScale,
          rotation: [0, 0, 32.5],
        },
        {
          url: "./assets/models/grass.glb",
        }
      );
    } else if (coordinate.type == 'horizontal') {
      mapView.Models.add(
        {
          target: new Coordinate(coordinate.latitude, coordinate.longitude),
          scale: horizontalScale,
          rotation: [0, 0, 32.5],
        },
        {
          url: "./assets/models/grass.glb",
        }
      );
    } else if (coordinate.type == 'exVertical') {
      mapView.Models.add(
        {
          target: new Coordinate(coordinate.latitude, coordinate.longitude),
          scale: extraVerticalScale,
          rotation: [0, 0, 32.5],
        },
        {
          url: "./assets/models/grass.glb",
        }
      );
    } else if (coordinate.type == 'exHorizontal') {
      mapView.Models.add(
        {
          target: new Coordinate(coordinate.latitude, coordinate.longitude),
          scale: extraHorizontalScale,
          rotation: [0, 0, 32.5],
        },
        {
          url: "./assets/models/grass.glb",
        }
      );
    }
    else if (coordinate.type == 'huge') {
      mapView.Models.add(
        {
          target: new Coordinate(coordinate.latitude, coordinate.longitude),
          scale: hugeScale,
          rotation: [0, 0, 32.5],
        },
        {
          url: "./assets/models/grass.glb",
        }
      );
    }
    else if (coordinate.type == 'exHuge') {
      mapView.Models.add(
        {
          target: new Coordinate(coordinate.latitude, coordinate.longitude),
          scale: extraHuge,
          rotation: [0, 0, 32.5],
        },
        {
          url: "./assets/models/grass.glb",
        }
      );
    } else if (coordinate.type == 'exDgHuge') {
      mapView.Models.add(
        {
          target: new Coordinate(coordinate.latitude, coordinate.longitude),
          scale: extraHuge,
          rotation: [0, 0, -12.5],
        },
        {
          url: "./assets/models/grass.glb",
        }
      );
    }
  })
}

// TODO: Temp code, remove when done testing
function addStreets() {
  const verticalScale = [5, 20, 0.05]
  const horizontalScale = [25, 5, 0.05]
  const hugeScale = [30, 30, 0.05]
  let streetList = []

  // Vertical scale
  streetList.push({ latitude: 43.463539049596186, longitude: -80.52389492213455, type: 'vertical' })
  streetList.push({ latitude: 43.46304320413439, longitude: -80.52345611205969, type: 'vertical' })
  streetList.push({ latitude: 43.46295424957172, longitude: -80.52337781868427, type: 'vertical' })

  // Horizontal scale
  streetList.push({ latitude: 43.463574441831085, longitude: -80.52407236014119, type: 'horizontal' })
  streetList.push({ latitude: 43.46345615964733, longitude: -80.5243280793897, type: 'horizontal' })
  streetList.push({ latitude: 43.46365492438589, longitude: -80.52374639794179, type: 'horizontal' })
  streetList.push({ latitude: 43.46362243080769, longitude: -80.52381609091306, type: 'horizontal' })

  // Huge scale
  // streetList.push({ latitude: 43.46375308912703, longitude: -80.5234512477109, type: 'huge' })
  // streetList.push({ latitude: 43.46386200807034, longitude: -80.52321663020821, type: 'huge' })
  // streetList.push({ latitude: 43.46368666863356, longitude: -80.52339408505112, type: 'huge' })
  // streetList.push({ latitude: 43.46379565951727, longitude: -80.5231584813563, type: 'huge' })

  streetList.forEach((coordinate) => {
    if (coordinate.type == 'vertical') {
      mapView.Models.add(
        {
          target: new Coordinate(coordinate.latitude, coordinate.longitude),
          scale: verticalScale,
          rotation: [0, 0, 32.5],
        },
        {
          url: "./assets/models/street.glb",
        }
      );
    } else if (coordinate.type == 'horizontal') {
      mapView.Models.add(
        {
          target: new Coordinate(coordinate.latitude, coordinate.longitude),
          scale: horizontalScale,
          rotation: [0, 0, 32.5],
        },
        {
          url: "./assets/models/street.glb",
        }
      );
    } else {
      mapView.Models.add(
        {
          target: new Coordinate(coordinate.latitude, coordinate.longitude),
          scale: hugeScale,
          rotation: [0, 0, 32.5],
        },
        {
          url: "./assets/models/street.glb",
        }
      );
    }
  })
}

// TODO: Temp code, remove when done testing
function addParkingLot() {
  mapView.Models.add(
    {
      target: new Coordinate(43.463767858514544, -80.5232988453617,),
      scale: [0.12, 0.09, 0.005],
      rotation: [0, 0, 32.5],
    },
    {
      url: "./assets/models/parking_street.glb",
    }
  );
}

// TODO: Temp code, remove when done testing
function addParkingMark() {
  mapView.Models.add(
    {
      target: new Coordinate(43.463767858514544, -80.5232988453617,),
      scale: [0.05, 0.05, 0.05],
      rotation: [0, 0, 32.5],
    },
    {
      url: "./assets/models/parking.glb",
    }
  );
}

// TODO: Temp code, remove when done testing
function addLakes() {
  mapView.Models.add(
    {
      target: new Coordinate(43.46295821582915, -80.52389587201739),
      scale: [0.03, 0.03, 0.1],
      rotation: [0, 0, 32.5],
    },
    {
      url: "./assets/models/lake1.glb",
    }
  );

  mapView.Models.add(
    {
      target: new Coordinate(43.46328382816158, -80.52279368983257,),
      scale: [0.015, 0.015, 0.1],
      rotation: [0, 0, 32.5],
    },
    {
      url: "./assets/models/lake2.glb",
    }
  );

  // mapView.Models.add(
  //   {
  //     target: new Coordinate(43.463886038638705, -80.52319971497941,),
  //         scale: [0.009, 0.01, 0.007],
  //         rotation: [0, 0, -58],
  //   },
  //   {
  //     url: "./assets/models/lake3.glb",
  //   }
  // );


}

// TODO: Temp code, remove when done testing
function addBushes() {
  let bushList = []

  bushList.push({ latitude: 43.46356784712305, longitude: -80.52278655109109, })
  bushList.push({ latitude: 43.46311750596907, longitude: -80.52303150568125, })
  bushList.push({ latitude: 43.46335490994362, longitude: -80.52252047772821, })
  bushList.push({ latitude: 43.462884618195424, longitude: -80.5234222366155, })
  bushList.push({ latitude: 43.46296257470178, longitude: -80.5236418634506, })
  bushList.push({ latitude: 43.46322409571854, longitude: -80.52411010253458, })
  bushList.push({ latitude: 43.46340015722247, longitude: -80.52421671129554, })
  bushList.push({ latitude: 43.46372609690067, longitude: -80.52384867973356, })
  bushList.push({ latitude: 43.46355867541901, longitude: -80.52357370941203, })
  bushList.push({ latitude: 43.46377318624069, longitude: -80.52281889114069, })
  bushList.push({ latitude: 43.463582392643325, longitude: -80.52420949679151, })
  bushList.push({ latitude: 43.463079233527274, longitude: -80.52324081592958, })
  bushList.push({ latitude: 43.46394400123322, longitude: -80.52349416813595, })
  bushList.push({ latitude: 43.46401281649374, longitude: -80.52301563655364, })
  bushList.push({ latitude: 43.464060244594535, longitude: -80.52322824273048, })


  bushList.forEach((coordinate) => {
    mapView.Models.add(
      {
        target: new Coordinate(coordinate.latitude, coordinate.longitude),
        scale: [0.7, 0.7, 0.7],
        rotation: [90, 0, 0],
      },
      {
        url: "./assets/models/bush.glb",
      }
    );
  })
}

// ! DEPRECATED
/** 
function fetchAllAmenities() {
  var amenitiesList = []

  mapData.getByType('point-of-interest').forEach((poi) => {
    amenitiesList.push({
      'id': poi.id,
      'name': poi.name,
      'image': getAmenityIcon(poi.name),
    })
  })

  var jsonAmenities = JSON.stringify(amenitiesList);

  if (mobileWebView) {
    FlutterChannel.postMessage("amenities" + jsonAmenities);
  }
}
*/

// Called whenever a user deselects a store from UI
window.resetCameraPosition = function resetCameraPosition() {
  mapView.Camera.animateTo(defaultCameraPosition);
}

// Usage: In Simon, when a user searches for a store, it highlights the store in the map,
// when the search bar is cleared the store is deselected from the map.
window.deselectAll = function deselectAll() {
  mapData.getByType('space').forEach((space) => {
    if (space.name && space.type != 'hallway' && !checkForWashroom(space.name)) {
      mapView.updateState(space, {
        color: defaultStoreColor,
      });
    }
  });
}

// Usage: When user selects store from search result, store is selected on map upon choosing
window.selectById = async function selectById(id, zoom) {
  const space = mapData.getById('space', id);

  if (!space) {
    return;
  }

  changeFloor(space.floor.id)

  // Select space on map
  mapView.updateState(space, { color: interactivityColor });

  if (zoom) {
    // Zoom to space
    await mapView.Camera.focusOn(space, { pitch: 1, duration: 500, maxZoomLevel: 20});
  }
}

// Usage: when searching for a categorie, multiple stores can be highlighted
// window.selectMany = function selectMany(idList) {
//   for (const id of idList) {
//     selectById(id, false, mapData, mapView);
//   }
// }

window.changeFloor = function changeFloor(floorId) {
  mapView.setFloor(floorId);
}

// Two IDs of stores or amenities is passed, 'accessible' refers to handicapped navigation
window.showDirections = async function showDirections(firstId, secondId, accessible) {
  // Get the spaces for the first and second spaces to navigate to and from.
  let first = mapData.getById('space', firstId);
  let second = mapData.getById('space', secondId);


  if (!first) {
    // Search for a point of interest instead
    first = mapData.getById('point-of-interest', firstId);
  }

  if (!second) {
    // Search for a point of interest instead
    second = mapData.getById('point-of-interest', secondId);
  }

  // Ensure that the spaces/POIs exist.
  if (!first || !second) {
    return;
  }

  const directions = mapView.getDirections(first, second, { accessible: accessible });

  // Show every lable when navigating
  setupLabelsAndInteractivity()

  await resetCameraPosition()

  if (directions) {
    // Add a path from the first space to the second space.
    await mapView.Navigation.draw(directions, {
      pathOptions: {
        accentColor: navigationColor,
        color: navigationColor,
    }
    });
    // await mapView.Camera.focusOn(first, { pitch: 1, duration: 500, });
  }

}

window.removeAllDirections = function removeAllDirections() {
  mapView.Navigation.clear();
  resetCameraPosition();
  toggleAmenities(false);
}

window.zoomIn = async function zoomIn() {
  await mapView.Camera.animateTo({ zoomLevel: mapView.Camera.zoomLevel + 1 })
}

window.zoomOut = async function zoomOut() {
  await mapView.Camera.animateTo({ zoomLevel: mapView.Camera.zoomLevel - 1 })
}

// Used internally when navigating
function showAllAmenities() {
  for (const poi of mapData.getByType('point-of-interest')) {
    mapView.Labels.add(poi.coordinate, poi.name, {
      appearance: {
        text: {
          size: 14
        },
        marker: {
          icon: getAmenityIcon(poi.name),
          iconSize: 30,
        }
      }
    });
  }
}

// Displays all amenities on map and yields amenities to Flutter using FlutterChannel
window.showAmenitiesOfType = function showAmenitiesOfType(type) {
  toggleAmenities(true)

  for (const poi of mapData.getByType('point-of-interest')) {
    if (poi.floor.id === mapView.currentFloor.id && poi.name == type) {
      mapView.Labels.add(poi.coordinate, poi.name, {
        appearance: {
          text: {
            size: 14
          },
          marker: {
            icon: getAmenityIcon(poi.name),
            iconSize: 30,
          }
        }
      });
    }
  }
}

// Focuses on one amenity when user navigates through UI
window.focusOnAmenity = async function focusOnAmenity(id) {
  const poi = mapData.getById('point-of-interest', id);

  if (!poi) {
    return;
  }

  changeFloor(poi.floor.id)

  await mapView.Camera.focusOn(poi, { pitch: 1, duration: 500, maxZoomLevel: 20, });
}

// True - Remove all store labels (Used internally when showing specific type of amenities)
// False - Remove all labels then turn store labels back on (used internally and 
// externally when clicked on a store or when user navigates out of amenities section)
// * Summary: Use this function when amenities genre or an amenity is deselected to toggle store
// * labels back on
window.toggleAmenities = function toggleAmenities(show) {
  if (show) {
    mapView.Labels.removeAll()
  } else {
    mapView.Labels.removeAll()
    setupLabelsAndInteractivity(mapData, mapView)
  }
}

// DEPRECATED - Using store logos now instead
/*
function getIconFromCategory(category) {
  let svgIcon = '';
 
  switch (category) {
    case 'clothes':
      svgIcon = `
      <svg fill="none" height="155" viewBox="0 0 182 155" width="182" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="green"/>
        <g clip-path="url(#clip0)">
          <path fill="white" d="M5.30816 58.8157C6.47402 60.2708 7.67953 61.7733 8.77311 63.2892C25.0966 85.9274 43.2854 108.058 60.8743 129.458C66.7386 136.593 72.8023 143.97 78.7068 151.256C80.5944 153.586 82.3572 154.754 84.2623 154.932C84.4342 154.948 84.6068 154.956 84.7794 154.956C86.4906 154.956 88.296 154.171 90.4072 152.518C94.0644 149.553 97.4091 146.333 100.406 142.893C124.457 116.114 147.801 89.965 167.464 67.9158C169.654 65.4598 171.799 62.9177 173.875 60.4599C175.765 58.2203 177.72 55.9049 179.698 53.6666C181.968 51.0968 182.075 48.5331 180.016 46.0462C178.816 44.6062 177.528 43.2181 176.159 41.8871C173.024 38.82 169.881 35.7595 166.728 32.7055C163.534 29.6034 160.345 26.498 157.162 23.3896C155.854 22.1091 154.551 20.7837 153.29 19.5019C151.797 17.9836 150.253 16.4121 148.682 14.8982C143.778 10.1704 139.676 6.31564 135.774 2.76519C134.77 1.90578 133.494 1.29955 132.095 1.01643C130.381 0.70995 128.629 0.573705 126.877 0.610366C120.253 0.584428 113.629 0.589456 108.08 0.591987H103.178H103.142L88.7523 1.1556C75.702 1.66678 63.3748 2.15091 51.1832 2.5925C48.3267 2.69626 45.1904 3.079 44.1325 6.33655C44.007 6.54824 43.8356 6.73873 43.6263 6.89828C43.5434 6.97167 43.4618 7.04563 43.3857 7.11838C42.0736 8.36806 40.7645 9.6197 39.4585 10.8732C36.218 13.977 32.8666 17.1864 29.5143 20.2997C20.4854 28.7175 12.084 37.5871 4.35753 46.8586C3.20014 48.3526 2.29517 49.972 1.66828 51.6711C1.49197 52.1559 1.43347 52.6649 1.49561 53.1688C1.55776 53.6726 1.73937 54.1611 2.03034 54.606C3.0806 56.0376 4.21304 57.4504 5.30816 58.8157ZM162.107 57.0265C162.075 57.067 162.042 57.1069 162.01 57.1467C161.412 57.887 160.896 58.5273 160.323 59.1435C158.016 61.6273 155.696 64.1028 153.362 66.5701C148.865 71.3466 144.214 76.2864 139.786 81.2394C129.385 92.8746 118.895 104.756 108.751 116.247C104.518 121.043 100.282 125.837 96.0448 130.629C95.8699 130.828 95.6965 131.024 95.5216 131.215C96.0539 129.905 96.6076 128.563 97.1757 127.252C100.015 120.702 102.854 114.154 105.693 107.607C112.151 92.7139 118.599 77.8181 125.036 62.9191C125.58 61.5635 126.025 60.1815 126.368 58.781C126.52 58.2166 126.679 57.6338 126.856 57.0265H162.107ZM114.552 57.0101L84.1452 129.693C81.707 121.317 78.9737 112.943 76.3173 104.823C71.3208 89.5361 66.1577 73.7368 62.9119 57.67L114.552 57.0101ZM98.0799 9.65159C103.39 9.48647 108.745 9.49653 113.939 9.50412C119.147 9.51298 124.532 9.5219 129.862 9.35614L163.671 47.0971L124.237 47.7708L123.742 47.7796L98.0799 9.65159ZM64.1095 48.4965C71.2582 36.2603 80.3426 25.9039 90.5897 14.7325L109.136 47.6589L64.1095 48.4965ZM49.7687 57.9419C53.8465 74.7193 59.4963 91.336 64.9613 107.41C66.5492 112.079 68.1804 116.877 69.7653 121.656C58.0345 108.556 47.2727 94.677 36.8431 81.2262C30.9112 73.5742 24.7832 65.6717 18.5349 57.9863C23.9246 57.4688 42.5279 57.4156 49.7687 57.9413V57.9419ZM72.6228 10.2102C75.0422 10.1899 77.4611 10.171 79.8795 10.1533C80.1077 10.1501 80.3259 10.1616 80.6119 10.1787C70.783 21.1552 59.8963 34.0144 52.762 48.6894H13.908C14.1413 48.3595 14.4037 48.0446 14.6934 47.7474C24.0058 38.5442 31.8474 30.8087 39.8494 22.9689C41.9028 20.9539 44.0283 18.9231 46.0794 16.9587C48.0005 15.121 49.9144 13.2777 51.8207 11.4286C52.1259 11.0709 52.5327 10.7818 53.005 10.5867C53.4772 10.3917 54.0004 10.2968 54.5274 10.3108C60.5605 10.3114 66.6924 10.2582 72.6228 10.2095V10.2102Z"/>
        </g>
        <defs>
          <clipPath id="clip0"><rect fill="white" height="155" transform="translate(0.777344)" width="181"/></clipPath>
        </defs>
      </svg>
      `;
      break;
    default:
      svgIcon = '';
  }
 
  return svgIcon;
}
*/

// Check if the space is a washroom to apply custom styling
function checkForWashroom(spaceName) {
  const text = spaceName.toLowerCase();
  return text.includes('bathroom') || text.includes('washroom') || text.includes('toilet') || text.includes('restroom');
}

// Amenities icons are type-specific and fixed (Parking, Food court, etc.) - Update icons or 
// add new amenities below
function getAmenityIcon(amenityType) {
  let icon = '';

  switch (amenityType) {
    case 'Washroom':
      icon = `
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 21.3904V26.5C10 26.7761 9.77614 27 9.5 27H6.5C6.22386 27 6 26.7761 6 26.5V21.3904C6 21.1609 5.84386 20.961 5.62129 20.9053L4.37871 20.5946C4.15614 20.5389 4 20.339 4 20.1095V14C4 13 5.25336 11 8 11C10.7466 11 12 13 12 14V20.1095C12 20.339 11.8439 20.5389 11.6213 20.5946L10.3787 20.9053C10.1561 20.961 10 21.1609 10 21.3904Z" fill="#1B1B1B" stroke="#1B1B1B" stroke-width="1.5"/>
                <circle cx="8" cy="7" r="2" fill="#1B1B1B" stroke="#1B1B1B" stroke-width="1.5"/>
                <line x1="15.5" y1="6" x2="15.5" y2="26" stroke="#1B1B1B"/>
                <path d="M24.5 27H21.5C21.2239 27 21 26.7761 21 26.5V22.5C21 22.2239 20.7761 22 20.5 22H18.6025C18.2894 22 18.0533 21.7156 18.111 21.4079L19.5 14C19.8333 13 21 11 23 11C25.5 11 26.1667 13 26.5 14L27.889 21.4079C27.9467 21.7156 27.7106 22 27.3975 22H25.5C25.2239 22 25 22.2239 25 22.5V26.5C25 26.7761 24.7761 27 24.5 27Z" fill="#1B1B1B" stroke="#1B1B1B" stroke-width="1.5"/>
                <circle cx="23" cy="7" r="2" fill="#1B1B1B" stroke="#1B1B1B" stroke-width="1.5"/>
              </svg>`;
      break;

    default:
      icon = `
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 21.3904V26.5C10 26.7761 9.77614 27 9.5 27H6.5C6.22386 27 6 26.7761 6 26.5V21.3904C6 21.1609 5.84386 20.961 5.62129 20.9053L4.37871 20.5946C4.15614 20.5389 4 20.339 4 20.1095V14C4 13 5.25336 11 8 11C10.7466 11 12 13 12 14V20.1095C12 20.339 11.8439 20.5389 11.6213 20.5946L10.3787 20.9053C10.1561 20.961 10 21.1609 10 21.3904Z" fill="#1B1B1B" stroke="#1B1B1B" stroke-width="1.5"/>
                <circle cx="8" cy="7" r="2" fill="#1B1B1B" stroke="#1B1B1B" stroke-width="1.5"/>
                <line x1="15.5" y1="6" x2="15.5" y2="26" stroke="#1B1B1B"/>
                <path d="M24.5 27H21.5C21.2239 27 21 26.7761 21 26.5V22.5C21 22.2239 20.7761 22 20.5 22H18.6025C18.2894 22 18.0533 21.7156 18.111 21.4079L19.5 14C19.8333 13 21 11 23 11C25.5 11 26.1667 13 26.5 14L27.889 21.4079C27.9467 21.7156 27.7106 22 27.3975 22H25.5C25.2239 22 25 22.2239 25 22.5V26.5C25 26.7761 24.7761 27 24.5 27Z" fill="#1B1B1B" stroke="#1B1B1B" stroke-width="1.5"/>
                <circle cx="23" cy="7" r="2" fill="#1B1B1B" stroke="#1B1B1B" stroke-width="1.5"/>
              </svg>`;
          `;
  }

  return icon;

}

// TODO: Temp code, remove when done testing
// init('65ca6d27d53f21f234ae6395', '0b25fc24d564c644443663d0b4d083605090d349975d0983fc96e06a5b1934dd', '65c0ff7430b94e3fabd5bb8c', 'm_1fc5f0f7fae65ba6', {
//   's_fa005f3d5fada368': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/a4d4304becabcd00970887da3bf25597ea336dca.png',
//   's_310f7df34a3c6853': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/292c30b0d8ba44f407ed9de0e1cfb197de016dd2.png',
//   's_5d2f5e3a61ba4fe4': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/c741334482d256690da443d1e2d7c62fb6e84100.png',
//   's_75d2b2934fe2495f': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/dc2fa5e7ba2c2aac23d3f6adc2c92d535be144c8.png',
//   's_b6adb793f5040daf': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/b52166bfdc4d00c78d68dc49e299dede5b62a847.png',
//   's_c4bbb9b22a85cf30': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/63205038a4fbd968d51401e09a46682d29346c3d.png',
//   's_c33647c792604ae1': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/2cfc5a41e6425cab93fbdf283d020c2735042d8a.png',
//   's_58172f1247075c72': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/6cf3f49b0334f4dada1b801050b3f2024fb4bc51.png',
//   's_21b3ffc46583729a': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/5fd8c7fc858e511473d406ab1bec0ebb8956f386.png',
//   's_4f386ba681ebb61d': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/317817284bcf09b4fa29de2b7d102750256bf6a9.png',
//   's_8b3aac9b4b9dc9ef': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/df5e5d436a1bbd6c238656cdfa1deb3ff0db764d.png',
//   's_d33e419c4bb801c0': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/622303fe4496afa8fb8255eaef7ace716f321fed.png',
//   's_ca4c11f3a7bc82da': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/c3f702f896784233f0cc71d6697dede1bf4ca58f.png',
//   's_6696afd32ac79ddb': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/983f7087bd7131954428429767dd3198233deb7c.png',
//   's_57e2ffa7f48e2cb6': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/dfe4f5f8ec42360f078e729548dc4a17962dfd79.png',
//   's_429e0a876a1e4490': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/992b3e6e43cd2737e4a52d5fa9f8256614d7e412.png',
//   's_45b97f4031d3ff2f': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/b3f0fdde9ee50f7540c3208f955223e53c2ceb61.png',
//   's_037e1a9fa2cb8331': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/654f4072326c03a4702fe528efaae0307fbb3c8d.png',
//   's_b08905633a9d2000': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/08e041a5925b0a5bbf25481322e98092f6038087.png',
//   's_ba1781eaf91646e9': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/389086747c500c816f978608840518541ecc5dec.png',
//   's_144702bf49e8c794': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/91106da1d5bc3164b53ca71317e2f02282c79b25.png',
//   's_0b35e438d8b666f6': 'https://cdn.mappedin.com/573386640ff1998d0d109790/resized/35b579a6e8e49c98b098733ef1bd38f643488260.png',
// }, false)

// ! Map id default - Test only: 660c0c6e7c0c4fe5b4cc484c
// ! Map id with POIs - Test only: 65c0ff7430b94e3fabd5bb8c