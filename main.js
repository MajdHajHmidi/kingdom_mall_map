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

async function init() {

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

export function resetCameraPosition() {
  mapView.Camera.animateTo(defaultCameraPosition);
}

function deselectAll() {
  mapData.getByType('space').forEach((space) => {
    if (space.name) {
      mapView.updateState(space, {
        color: 'initial',
      });
    }
  });
}

async function selectById(id, zoom) {
  const space = mapData.getById('space', id);

  if (!space) {
    return;
  }

  mapView.updateState(space, { color: interactivityColor });

  if (zoom) {
    await mapView.Camera.focusOn(space);
  }
}

function selectMany(idList) {
  for (const id of idList) {
    selectById(id, false, mapData, mapView);
  }
}

function changeFloor(floorId) {
  mapView.setFloor(floorId);
}

async function showDirections(firstId, secondId, accessible) {
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

function removeAllDirections() {
  mapView.Navigation.clear();
}

init();
