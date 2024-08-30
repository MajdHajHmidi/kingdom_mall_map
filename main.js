import { getMapData, show3dMap } from "./node_modules/@mappedin/mappedin-js";
import './node_modules/@mappedin/mappedin-js/lib/index.css';

const defaultSpaceColor = '#f2efdc';
const defaultStoreColor = '#e5e5e3';
const hallwayColor = '#fafafa';
const markersForegroundColor = '#fafafa';
const interactivityColor = '#575654';
const navigationColor = '#fbda03';
const objectsColors = "#dededc";
const washroomsColor = "#dadee8";

const washroomsIconSVG = `
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 21.3904V26.5C10 26.7761 9.77614 27 9.5 27H6.5C6.22386 27 6 26.7761 6 26.5V21.3904C6 21.1609 5.84386 20.961 5.62129 20.9053L4.37871 20.5946C4.15614 20.5389 4 20.339 4 20.1095V14C4 13 5.25336 11 8 11C10.7466 11 12 13 12 14V20.1095C12 20.339 11.8439 20.5389 11.6213 20.5946L10.3787 20.9053C10.1561 20.961 10 21.1609 10 21.3904Z" fill="#1B1B1B" stroke="#1B1B1B" stroke-width="1.5"/>
                  <circle cx="8" cy="7" r="2" fill="#1B1B1B" stroke="#1B1B1B" stroke-width="1.5"/>
                  <line x1="15.5" y1="6" x2="15.5" y2="26" stroke="#1B1B1B"/>
                  <path d="M24.5 27H21.5C21.2239 27 21 26.7761 21 26.5V22.5C21 22.2239 20.7761 22 20.5 22H18.6025C18.2894 22 18.0533 21.7156 18.111 21.4079L19.5 14C19.8333 13 21 11 23 11C25.5 11 26.1667 13 26.5 14L27.889 21.4079C27.9467 21.7156 27.7106 22 27.3975 22H25.5C25.2239 22 25 22.2239 25 22.5V26.5C25 26.7761 24.7761 27 24.5 27Z" fill="#1B1B1B" stroke="#1B1B1B" stroke-width="1.5"/>
                  <circle cx="23" cy="7" r="2" fill="#1B1B1B" stroke="#1B1B1B" stroke-width="1.5"/>
                </svg>
`
// ! Map id default - Test only: 660c0c6e7c0c4fe5b4cc484c
// ! Map id with POIs - Test only: 65c0ff7430b94e3fabd5bb8c

let mapOptions;
let initialFloorId;

let mapData;
let mapView;
let defaultCameraPosition;

let mobileWebView;

let storesLogos = new Map();

// ! TODO: Temp code, remove when done testing
const storesFakeNames = new Map();

// 'storesLogosDictionary' is a map pairing every store id with the url of the store logo
// 'viewOnlyStoreId' is optinal, when not null, mapView will focus on it right away and map won't be interactive
window.init = async function init(mapKey, mapSecret, mapId, initialFloorIdValue, storesLogosDictionary, mobileWebViewValue, viewOnlyStoreId) {

  // ! TODO: Temp code, remove when done testing
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
      { initialFloor: initialFloorId, outdoorView: { enabled: false }, pitch: 0 }
    );

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

    // Fetch from map and send to Flutter app
    fetchAllFloors()
    fetchAllAmenities()

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

// ! TODO: Temp code, remove when done testing
function setFakeStoreNames() {
  storesFakeNames.set('s_bce4f6eba1eacbce', 'Apple');
  storesFakeNames.set('s_99031e56124e15be', 'Starbucks Coffee');
  storesFakeNames.set('s_16a3dd1e565014c9', 'Michael Kors');
  storesFakeNames.set('s_2666c01300f4903b', 'T-Mobile');
  storesFakeNames.set('s_100b315377825045', 'AT&T');
  storesFakeNames.set('s_6822d0f8c7c97cde', 'Frost');
  storesFakeNames.set('s_73c5dd8bb0f19832', 'Two Boys Donuts');
  storesFakeNames.set('s_172af9e6c417773d', 'Laser Away');
  storesFakeNames.set('s_29886fd1f182151e', 'Sunglass Hut');
  storesFakeNames.set('s_251773d06b4a1db5', 'Fabletics');
  storesFakeNames.set('s_e7d0bf05da390ef3', 'Tempur Pedic Albuquerque');
  storesFakeNames.set('s_3063ef04147d4b7f', 'Purple');
  storesFakeNames.set('s_d5d9efd1b79010ba', 'Toni & Guy');
  storesFakeNames.set('s_40e9c3d8aad11204', 'The Melting Pot');
  storesFakeNames.set('s_6b0a171066d36ce3', 'Avanti Milano');
  storesFakeNames.set('s_2f61d7db828c720d', 'LUSH');
  storesFakeNames.set('s_49c7d1bf15c3c3ed', 'Altar\'d State');
  storesFakeNames.set('s_a6282dbddce83ca9', 'lululemon');
  storesFakeNames.set('s_6b374885c6589958', 'Williams-Sonoma');
  storesFakeNames.set('s_1cd760d028ef9694', 'Pottery Barn');
  storesFakeNames.set('s_888fd83090613aeb', 'Talbots');
  storesFakeNames.set('s_a05e2b9adb105f83', 'Sushi Freak');
  storesFakeNames.set('s_6e32d608d4783694', 'UNTUCKit');
  storesFakeNames.set('s_efce03cb7ee1d2e1', 'The North Face');
  storesFakeNames.set('s_22014d7b479080c1', 'Mati');
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
          mapView.Labels.add(space, space.name, {
            appearance: {
              marker: {
                icon: washroomsIconSVG,
                iconSize: 25,
                foregroundColor: {
                  active: markersForegroundColor,
                },
              }
            }
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
        //     marker: {
        //       // BELOW: Category icons (Changed to store logos instead)
        //       // icon: getIconFromCategory(storesCategories.get(space.id)),

        //       // BELOW: Logo icons
        //       icon: storesLogos.get(space.id),
        //       foregroundColor: {
        //         active: markersForegroundColor,
        //       },
        //       iconSize: 34
        //     }
        //   }
        // });

        // TEMP FAKE CODE BELOW
        mapView.Labels.add(space, storesFakeNames.get(space.id), {
          appearance: {
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
      FlutterChannel.postMessage(clickedSpace[0].id);
    }

    // 4 Zoom to the clicked space
    await mapView.Camera.focusOn(clickedSpace[0], {
      maxZoomLevel: 20,
      pitch: 1,
      duration: 500,
    });
  });
}

function fetchAllFloors() {
  var floorsList = []

  mapData.getByType('floor').forEach((floor) => {
    // ! Floor name is not the display name (L1, G, U1, etc.), not (Lower Ground, Third floor, etc.)
    floorsList.push({
      'id': floor.id,
      'name': floor.name,
    })
  })

  var jsonFloors = JSON.stringify(floorsList);

  if (mobileWebView) {
    FlutterChannel.postMessage(jsonFloors);
  }
}

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
    FlutterChannel.postMessage(jsonAmenities);
  }
}

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

  // Select space on map
  mapView.updateState(space, { color: interactivityColor });

  if (zoom) {
    // Zoom to space
    await mapView.Camera.focusOn(space, { pitch: 1, duration: 500, maxZoomLevel: 20});
  }
}

// Usage: when searching for a categorie, multiple stores can be highlighted
window.selectMany = function selectMany(idList) {
  for (const id of idList) {
    selectById(id, false, mapData, mapView);
  }
}

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
  showAllAmenities()
  setupLabelsAndInteractivity()

  if (directions) {
    // Add a path from the first space to the second space.
    await mapView.Navigation.draw(directions, {
      pathOptions: {
        color: navigationColor,
      },
    });
    await mapView.Camera.focusOn(first, { pitch: 1, duration: 500, maxZoomLevel: 20 });
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
        marker: {
          icon: getAmenityIcon(poi.name),
          iconSize: 34,
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
          marker: {
            icon: getAmenityIcon(poi.name),
            iconSize: 34,
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

  await mapView.Camera.focusOn(poi, { pitch: 1, duration: 500, });
}

// On - Remove all labels (Used internally when showing specific type of amenities)
// Off - Remove all labels then turn store labels back on (used internally and 
// externally when clicked on a store or when user navigates out of amenities section)
window.toggleAmenities = function toggleAmenities(show) {
  if (show) {
    mapView.Labels.removeAll()
  } else {
    mapView.Labels.removeAll()
    setupLabelsAndInteractivity(mapData, mapView)
  }
}

// Deprecated - Using store logos now instead
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
    case 'Parking':
      icon = `
          <svg fill="none" height="155" viewBox="0 0 182 155" width="182" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="white"/>
            <g clip-path="url(#clip0)">
              <path fill="black" d="M5.30816 58.8157C6.47402 60.2708 7.67953 61.7733 8.77311 63.2892C25.0966 85.9274 43.2854 108.058 60.8743 129.458C66.7386 136.593 72.8023 143.97 78.7068 151.256C80.5944 153.586 82.3572 154.754 84.2623 154.932C84.4342 154.948 84.6068 154.956 84.7794 154.956C86.4906 154.956 88.296 154.171 90.4072 152.518C94.0644 149.553 97.4091 146.333 100.406 142.893C124.457 116.114 147.801 89.965 167.464 67.9158C169.654 65.4598 171.799 62.9177 173.875 60.4599C175.765 58.2203 177.72 55.9049 179.698 53.6666C181.968 51.0968 182.075 48.5331 180.016 46.0462C178.816 44.6062 177.528 43.2181 176.159 41.8871C173.024 38.82 169.881 35.7595 166.728 32.7055C163.534 29.6034 160.345 26.498 157.162 23.3896C155.854 22.1091 154.551 20.7837 153.29 19.5019C151.797 17.9836 150.253 16.4121 148.682 14.8982C143.778 10.1704 139.676 6.31564 135.774 2.76519C134.77 1.90578 133.494 1.29955 132.095 1.01643C130.381 0.70995 128.629 0.573705 126.877 0.610366C120.253 0.584428 113.629 0.589456 108.08 0.591987H103.178H103.142L88.7523 1.1556C75.702 1.66678 63.3748 2.15091 51.1832 2.5925C48.3267 2.69626 45.1904 3.079 44.1325 6.33655C44.007 6.54824 43.8356 6.73873 43.6263 6.89828C43.5434 6.97167 43.4618 7.04563 43.3857 7.11838C42.0736 8.36806 40.7645 9.6197 39.4585 10.8732C36.218 13.977 32.8666 17.1864 29.5143 20.2997C20.4854 28.7175 12.084 37.5871 4.35753 46.8586C3.20014 48.3526 2.29517 49.972 1.66828 51.6711C1.49197 52.1559 1.43347 52.6649 1.49561 53.1688C1.55776 53.6726 1.73937 54.1611 2.03034 54.606C3.0806 56.0376 4.21304 57.4504 5.30816 58.8157ZM162.107 57.0265C162.075 57.067 162.042 57.1069 162.01 57.1467C161.412 57.887 160.896 58.5273 160.323 59.1435C158.016 61.6273 155.696 64.1028 153.362 66.5701C148.865 71.3466 144.214 76.2864 139.786 81.2394C129.385 92.8746 118.895 104.756 108.751 116.247C104.518 121.043 100.282 125.837 96.0448 130.629C95.8699 130.828 95.6965 131.024 95.5216 131.215C96.0539 129.905 96.6076 128.563 97.1757 127.252C100.015 120.702 102.854 114.154 105.693 107.607C112.151 92.7139 118.599 77.8181 125.036 62.9191C125.58 61.5635 126.025 60.1815 126.368 58.781C126.52 58.2166 126.679 57.6338 126.856 57.0265H162.107ZM114.552 57.0101L84.1452 129.693C81.707 121.317 78.9737 112.943 76.3173 104.823C71.3208 89.5361 66.1577 73.7368 62.9119 57.67L114.552 57.0101ZM98.0799 9.65159C103.39 9.48647 108.745 9.49653 113.939 9.50412C119.147 9.51298 124.532 9.5219 129.862 9.35614L163.671 47.0971L124.237 47.7708L123.742 47.7796L98.0799 9.65159ZM64.1095 48.4965C71.2582 36.2603 80.3426 25.9039 90.5897 14.7325L109.136 47.6589L64.1095 48.4965ZM49.7687 57.9419C53.8465 74.7193 59.4963 91.336 64.9613 107.41C66.5492 112.079 68.1804 116.877 69.7653 121.656C58.0345 108.556 47.2727 94.677 36.8431 81.2262C30.9112 73.5742 24.7832 65.6717 18.5349 57.9863C23.9246 57.4688 42.5279 57.4156 49.7687 57.9413V57.9419ZM72.6228 10.2102C75.0422 10.1899 77.4611 10.171 79.8795 10.1533C80.1077 10.1501 80.3259 10.1616 80.6119 10.1787C70.783 21.1552 59.8963 34.0144 52.762 48.6894H13.908C14.1413 48.3595 14.4037 48.0446 14.6934 47.7474C24.0058 38.5442 31.8474 30.8087 39.8494 22.9689C41.9028 20.9539 44.0283 18.9231 46.0794 16.9587C48.0005 15.121 49.9144 13.2777 51.8207 11.4286C52.1259 11.0709 52.5327 10.7818 53.005 10.5867C53.4772 10.3917 54.0004 10.2968 54.5274 10.3108C60.5605 10.3114 66.6924 10.2582 72.6228 10.2095V10.2102Z"/>
            </g>
            <defs>
              <clipPath id="clip0"><rect fill="white" height="155" transform="translate(0.777344)" width="181"/></clipPath>
            </defs>
          </svg>
          `;
      break;

    default:
      icon = '';
  }

  return icon;

}
