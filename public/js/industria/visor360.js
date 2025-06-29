import { Viewer, utils } from '@photo-sphere-viewer/core';
import { PlanPlugin } from '@photo-sphere-viewer/plan-plugin';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin';
import { TileLayer } from 'leaflet';

const params = new URLSearchParams(window.location.search);
const slug = params.get("tour") || "pepsico-techo";

let viewer;
let autorotate;

fetch(`/api/industria/tour-plan?tour=${slug}`)
  .then(res => res.json())
  .then(data => {
    const container = document.getElementById("viewer");
    container.innerHTML = "";

    viewer = new Viewer({
      container: container,
      caption: data.tour.descripcion,
      description: data.tour.descripcion_html,
      loadingImg: "/images/menu-footer-image.png",
      touchmoveTwoFingers: false,
      mousewheelCtrlKey: false,
      defaultYaw: '0deg',
      navbar: ['zoom', 'move', 'caption', 'fullscreen', 'description'],
      plugins: [
        [PlanPlugin, {
          defaultZoom: 17,
          coordinates: data.plan.center,
          bearing: '180deg',
          layers: [
            {
              name: 'OpenStreetMap',
              layer: new TileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 22
              }),
              attribution: '&copy; OpenStreetMap contributors',
            },
            {
              name: 'OpenTopoMap',
              layer: new TileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                
                maxZoom: 18,
              }),
              attribution: 'Esri &mdash; Source: Esri',
            }
          ],
          hotspots: data.plan.hotspots || [],
        }],
        [MarkersPlugin, {
          markers: data.nodes.map(nodo => ({
            id: `marker-${nodo.id}`,
            tooltip: nodo.name,
            position: { yaw: 0, pitch: 0 },
            image: 'https://photo-sphere-viewer-data.netlify.app/assets/pictos/pin-blue.png',
            size: { width: 32, height: 32 },
            anchor: 'bottom center',
            data: {
              plan: {
                coordinates: [nodo.gps[0], nodo.gps[1]],
                size: 25,
                image: 'https://photo-sphere-viewer-data.netlify.app/assets/pictos/pin-blue.png',
              },
            },
          })),
        }],
        [VirtualTourPlugin, {
          positionMode: 'gps',
          renderMode: '3d',
        }]
      ]
    });

    autorotate = viewer.getPlugin('autorotate');
    const virtualTour = viewer.getPlugin(VirtualTourPlugin);
    const plan = viewer.getPlugin(PlanPlugin);
    const markers = viewer.getPlugin(MarkersPlugin);

    const tourNodes = data.nodes.map(n => ({
      id: n.id,
      panorama: n.panorama,
      thumbnail: n.thumbnail,
      name: n.name,
      caption: n.caption,
      gps: n.gps,
      sphereCorrection: n.sphereCorrection,
    }));

    virtualTour.setNodes(tourNodes, tourNodes[0].id);

    plan.addEventListener('select-hotspot', (e) => {
      if (e.hotspot?.id) {
        virtualTour.setNode(e.hotspot.id);
      }
    });

    markers.addEventListener('select-marker', (e) => {
      const id = e.marker?.id?.replace('marker-', '');
      if (id) {
        virtualTour.setNode(id);
      }
    });

    intro();
  })
  .catch((err) => {
    console.error("❌ Error al cargar el tour:", err);
  });

function intro() {
  autorotate?.stop();
  viewer.navbar.hide();

  new utils.Animation({
    properties: {
      pitch: { start: -Math.PI / 2, end: 0 },
      yaw: { start: Math.PI / 2, end: 0 },
      zoom: { start: 0, end: 50 },
      maxFov: { start: 130, end: 90 },
      fisheye: { start: 2, end: 0 },
    },
    duration: 2000,
    easing: 'inOutQuad',
    onTick: (props) => {
      viewer.setOptions({
        fisheye: props.fisheye,
        maxFov: props.maxFov,
      });
      viewer.rotate({ yaw: props.yaw, pitch: props.pitch });
      viewer.zoom(props.zoom);
    },
  }).then(() => {
    autorotate?.start();
    viewer.navbar.show();
    viewer.setOptions({
      mousemove: true,
      mousewheel: true,
    });
  });
}