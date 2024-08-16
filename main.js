import { getMapData, show3dMap } from "./node_modules/@mappedin/mappedin-js";
import './node_modules/@mappedin/mappedin-js/lib/index.css';

// TODO: Adjust constants if necessary
const interactivityColor = '#515151';
const mapOptions = {
  key: "65ca6d27d53f21f234ae6395",
  secret: "0b25fc24d564c644443663d0b4d083605090d349975d0983fc96e06a5b1934dd",
  mapId: "65c0ff7430b94e3fabd5bb8c",
};
const initialFloorId = '????';

async function init() {
  const mapData = await getMapData(mapOptions);
  const mapView = await show3dMap(
    document.getElementById("mappedin-map"),
    mapData,
    { initialFloor: initialFloorId }
  );

  const defaultCameraPosition = {
    bearing: mapView.Camera.bearing,
    pitch: mapView.Camera.pitch,
    zoomLevel: mapView.Camera.zoomLevel,
    center: mapData.mapCenter,
  };

  setupLabelsAndInteractivity(mapData, mapView);
  handleClickChanges(mapData, mapView);
}

function setupLabelsAndInteractivity(mapData, mapView) {
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

async function handleClickChanges(mapData, mapView) {
  mapView.on('click', async (e) => {
    if (!e.spaces[0].name) {
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

    await mapView.Camera.focusOn(clickedSpace[0]);
  });
}

function resetCameraPosition(defaultTarget, mapView) {
  mapView.Camera.animateTo(defaultTarget);
}

function deselectAll(mapData, mapView) {
  mapData.getByType('space').forEach((space) => {
    if (space.name) {
      mapView.updateState(space, {
        color: 'initial',
      });
    }
  });
}

async function selectById(id, zoom, mapData, mapView) {
  const space = mapData.getById('space', id);

  if (!space) {
    return;
  }

  mapView.updateState(space, { color: interactivityColor });

  if (zoom) {
    await mapView.Camera.focusOn(space);
  }
}

function selectMany(idList, mapData, mapView) {
  for (const id of idList) {
    selectById(id, false, mapData, mapView);
  }
}

function changeFloor(floorId, mapView) {
  mapView.setFloor(floorId);
}

async function showDirections(firstId, secondId, accessible, mapData, mapView) {
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

function removeAllDirections(mapView) {
  mapView.Navigation.clear();
}

init();
