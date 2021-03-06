import React, { Component } from 'react';
import * as THREE from 'three';
import { connect } from 'react-redux';
import OrbitControls from 'three-orbitcontrols';
import buildCanvasSkybox from '../ThreeJSModules/BuildCanvasSkybox';
import droneModel from '../ThreeJSModules/Drone3DModel';
import cardinalDirections from '../ThreeJSModules/CardinalDirections';
import Obstacles from '../ThreeJSModules/Obstacles';
import _ from 'lodash';
import { updateBuildDronePosition } from '../store';
import { createSceneObjs } from '../utils/canvasUtils';

class BuildCanvas extends Component {
  constructor(props) {
    super(props);

    //RENDERER
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(1024, 576, false);

    //SCENE
    this.scene = new THREE.Scene();

    //CAMERA
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      1000
    );

    this.camera.position.set(-2.8, 5.4, -14.8);

    //ORBITAL CONTROLS
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableKeys = false;
    this.controls.enableDamping = true; //an animation loop is required when damping or auto-rotation are enabled
    this.controls.dampingFactor = 1;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 50;
    // this.controls.maxPolarAngle = Math.PI / 2;

    // //SKYBOX
    this.scene.add(buildCanvasSkybox);

    //DRONE 3D MODEL
    this.drone3DModel = droneModel.clone();
    this.drone3DModel.position.set(
      this.props.postTakeoffPosition.x,
      this.props.postTakeoffPosition.y,
      this.props.postTakeoffPosition.z
    );

    this.controls.target = this.drone3DModel.position;
    this.drone3DModel.rotation.y = Math.PI;
    this.drone3DModel.scale.set(0.1, 0.1, 0.1);

    this.scene.add(this.drone3DModel);

    //GRID
    this.gridEdgeLength = this.props.voxelSize;
    // this.props.scale / (this.props.scale / this.props.voxelSize);

    this.gridGeo = new THREE.PlaneBufferGeometry(
      this.props.voxelSize,
      this.props.voxelSize,
      this.props.scale,
      this.props.scale
    );
    this.gridMaterial = new THREE.MeshBasicMaterial({
      color: 0x488384,
      wireframe: true,
    });
    this.grid = new THREE.Mesh(this.gridGeo, this.gridMaterial);
    this.grid.rotation.x = Math.PI / 2;
    this.grid.position.set(0, this.gridEdgeLength * -0.5, 0);
    this.scene.add(this.grid);

    // GRID CUBE
    const gridCubeGeometry = new THREE.BoxGeometry(
      this.gridEdgeLength,
      this.gridEdgeLength,
      this.gridEdgeLength
    );

    const gridCubeEdges = new THREE.EdgesGeometry(gridCubeGeometry);
    const gridCubeLines = new THREE.LineSegments(
      gridCubeEdges,
      new THREE.LineBasicMaterial({ color: 0x488384 })
    );
    //This line is to remind readers that the cube is centered
    gridCubeLines.position.set(0, 0, 0);
    this.scene.add(gridCubeLines);

    //NORTH STAR
    this.scene.add(cardinalDirections);

    //TAKEOFF LINE
    const takeoffLineMaterial = new THREE.LineBasicMaterial({
      color: 'yellow',
      linewidth: 4,
    });

    const takeoffLineGeometry = new THREE.Geometry();
    takeoffLineGeometry.vertices.push(new THREE.Vector3(0, 0, 0));
    takeoffLineGeometry.vertices.push(new THREE.Vector3(0, 1, 0));

    this.takeoffLine = new THREE.Line(takeoffLineGeometry, takeoffLineMaterial);
    this.takeoffLine.position.set(0, this.gridEdgeLength * -0.5, 0);
    this.scene.add(this.takeoffLine);

    //AMBIENT LIGHT
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);

    this.scene.add(ambientLight);
  }

  componentDidMount() {
    const { sceneObjects } = this.props;
    document.getElementById('canvas').appendChild(this.renderer.domElement);
    this.animate();
    this.redrawLinesAndMoveDrone();
    this.sceneObjects = createSceneObjs(sceneObjects);
    this.scene.add(this.sceneObjects);
  }

  componentDidUpdate = prevProps => {
    // draw line and keep drone at tip of line
    this.redrawLinesAndMoveDrone(prevProps);
    const { sceneObjects } = this.props;

    if (this.sceneObjects) {
      this.scene.remove(this.sceneObjects);
    }
    this.sceneObjects = createSceneObjs(sceneObjects);
    this.scene.add(this.sceneObjects);
  };

  redrawLinesAndMoveDrone = (prevProps = null) => {
    const {
      postTakeoffPosition,
      flightInstructions: newFlightInstructions,
      droneOrientation,
    } = this.props;
    let oldFlightInstructions;
    if (prevProps) {
      const { flightInstructions } = prevProps;
      oldFlightInstructions = flightInstructions;
    } else {
      oldFlightInstructions = null;
    }

    this.drone3DModel.rotation.y = Math.PI;

    //REMOVE OLD LINE AND LAND LINE
    if (this.line) {
      this.scene.remove(this.line);
      this.scene.remove(this.landLine);
    }

    //DRAW NEW FLIGHT PATH
    const material = new THREE.LineBasicMaterial({
      color: 0xff0000,
    });
    const geometry = new THREE.Geometry();

    const point = { ...postTakeoffPosition };
    geometry.vertices.push(new THREE.Vector3(point.x, point.y, point.z));

    if (!_.isEqual(oldFlightInstructions, newFlightInstructions)) {
      newFlightInstructions.slice(1, -1).forEach(instructionObj => {
        const { droneInstruction, drawInstruction } = instructionObj;

        //just checking to see if the command is a rotation
        const [command] = droneInstruction.split(' ');
        if (command === 'cw') {
          this.drone3DModel.rotation.y =
            Math.PI - (Math.PI / 2) * droneOrientation;
        } else if (command === 'ccw') {
          this.drone3DModel.rotation.y =
            -Math.PI - (Math.PI / 2) * droneOrientation;
        } else {
          const [z, x, y] = drawInstruction;
          point.x += x;
          point.y += y;
          point.z += z;
          // x -> z
          // y -> x
          // z -> y
          geometry.vertices.push(new THREE.Vector3(point.x, point.y, point.z));
        }
      });

      //moves the camera to follow the drone as the path is drawn
      this.followDroneWithCamera(point, 7);

      this.line = new THREE.Line(geometry, material);

      this.scene.add(this.line);

      //move drone to the tip of the path
      this.drone3DModel.position.set(point.x, point.y, point.z);
      //update the drone's position for redux
      this.props.updateBuildDronePosition({
        x: point.x,
        y: point.y + 5, //account for shifted plane in y-coordinate
        z: point.z,
      });
    }

    if (!_.isEqual(point, postTakeoffPosition)) {
      //add land line if drone is not still at the starting position
      const landLineGeometry = new THREE.Geometry();
      landLineGeometry.vertices.push(new THREE.Vector3(point.x, -5, point.z));
      const landLineMaterial = new THREE.LineBasicMaterial({ color: 'blue' });

      landLineGeometry.vertices.push(
        new THREE.Vector3(point.x, point.y, point.z)
      );
      this.landLine = new THREE.Line(landLineGeometry, landLineMaterial);
      this.scene.add(this.landLine);
    }
  };

  followDroneWithCamera = (point, followDistance = 5) => {
    //this works because the camera's target is set to be the drone3D model (in the constructor), so it will always turn to face the drone when we move it

    //we always want the camera to be slightly behind and above the drone, looking in the same direction that it is facing
    const { droneOrientation } = this.props;
    if (droneOrientation === 0) {
      this.camera.position.set(point.x, point.y + 2, point.z - followDistance);
    } else if (droneOrientation === 1) {
      this.camera.position.set(point.x + followDistance, point.y + 2, point.z);
    } else if (droneOrientation === 2) {
      this.camera.position.set(point.x, point.y + 2, point.z + followDistance);
    } else {
      this.camera.position.set(point.x - followDistance, point.y + 2, point.z);
    }
  };

  animate = async () => {
    requestAnimationFrame(this.animate);

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  render() {
    return <div id="canvas" />;
  }
}

const mapState = state => {
  return {
    scale: state.scale,
    voxelSize: state.voxelSize,
    currentDronePosition: state.currentDronePosition,
    startingPosition: state.startingPosition,
    obstacles: state.obstacles,
    postTakeoffPosition: state.postTakeoffPosition,
    droneOrientation: state.droneOrientation,
    flightInstructions: state.flightInstructions,
    sceneObjects: state.sceneObjects,
    preVisualizeAnimation: state.preVisualizeAnimation,
  };
};

const mapDispatch = dispatch => {
  return {
    updateBuildDronePosition: updatedPosition => {
      dispatch(updateBuildDronePosition(updatedPosition));
    },
  };
};

export default connect(
  mapState,
  mapDispatch
)(BuildCanvas);
