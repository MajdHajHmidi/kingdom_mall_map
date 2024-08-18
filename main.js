import { getMapData, show3dMap } from "./node_modules/@mappedin/mappedin-js";
import './node_modules/@mappedin/mappedin-js/lib/index.css';

let interactivityColor;
let mapOptions;
let initialFloorId;

let mapData;
let mapView;
let defaultCameraPosition;

window.init = async function init(interactivityColorValue, mapKey, mapSecret, mapId, initialFloorIdValue) {
  interactivityColor = interactivityColorValue;
  mapOptions = {
  key: mapKey,
  secret: mapSecret,
  mapId: mapId,
};
  initialFloorId = initialFloorIdValue;

  mapData = await getMapData(mapOptions);
  mapView = await show3dMap(
    document.getElementById("mappedin-map"),
    mapData,
    { initialFloor: initialFloorId }
  );

  defaultCameraPosition = {
    bearing: mapView.Camera.bearing,
    pitch: mapView.Camera.pitch,
    zoomLevel: mapView.Camera.zoomLevel,
    center: mapData.mapCenter,
  };

  window.mapData = mapData;
  window.mapView = mapView;
  // window.defaultCameraPosition = defaultCameraPosition;

  setupLabelsAndInteractivity();
  handleClickChanges();
}

function setupLabelsAndInteractivity() {
  mapData.getByType('space').forEach(space => {
    if (space.name) {
      mapView.updateState(space, {
        interactive: true,
        hoverColor: interactivityColor,
      });
      mapView.Labels.add(space, space.name, {});
    }
  });
}

async function handleClickChanges() {
  mapView.on('click', async (e) => {
    if (e.spaces.length == 0 || !e.spaces[0].name) {
      return;
    }

    mapData.getByType('space').forEach((space) => {
      if (space.name) {
        mapView.updateState(space, {
          color: 'initial',
        });
      }
    });

    const clickedSpace = e.spaces;
    mapView.updateState(clickedSpace[0], { color: interactivityColor });
    if (FlutterChannel) {
      FlutterChannel.postMessage(clickedSpace[0].id);
    }

    await mapView.Camera.focusOn(clickedSpace[0]);
  });
}

window.resetCameraPosition = function resetCameraPosition() {
  mapView.Camera.animateTo(defaultCameraPosition);
}

window.deselectAll = function deselectAll() {
  mapData.getByType('space').forEach((space) => {
    if (space.name) {
      mapView.updateState(space, {
        color: 'initial',
      });
    }
  });
}

window.selectById = async function selectById(id, zoom) {
  const space = mapData.getById('space', id);

  if (!space) {
    return;
  }

  mapView.updateState(space, { color: interactivityColor });

  if (zoom) {
    await mapView.Camera.focusOn(space);
  }
}

window.selectMany = function selectMany(idList) {
  for (const id of idList) {
    selectById(id, false, mapData, mapView);
  }
}

window.changeFloor = function changeFloor(floorId) {
  mapView.setFloor(floorId);
}

window.showDirections = async function showDirections(firstId, secondId, accessible) {
  const firstSpace = mapData.getById('space', firstId);
  const secondSpace = mapData.getById('space', secondId);

  if (firstSpace && secondSpace) {
    const directions = mapView.getDirections(firstSpace, secondSpace, { accessible: accessible });

    if (directions) {
      await mapView.Navigation.draw(directions);
      await mapView.Camera.focusOn(firstSpace);
    }
  }
}

window.removeAllDirections = function removeAllDirections() {
  mapView.Navigation.clear();
}
