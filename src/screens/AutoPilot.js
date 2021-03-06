import React, { Component } from 'react';
import { connect } from 'react-redux';
import StatusContainer from '../components/StatusContainer';
import DroneTelemetry from '../components/DroneTelemetry';
import AutoPilotCanvas from '../components/AutoPilotCanvas';
import { Button, Segment, List, Header, Icon, Image } from 'semantic-ui-react';
import wait from 'waait';
import { updateCDP, updateCDR, updateDroneConnectionStatus } from '../store';
import commandDelays from '../drone/commandDelays';

const { ipcRenderer } = window.require('electron');

class AutoPilot extends Component {
  constructor() {
    super();

    this.state = {
      runButtonsDisabled: false,
      isRecording: false,
    };
  }

  componentDidMount() {
    ipcRenderer.on('drone-connection', (event, droneConnectionStatus) => {
      // Send a command to drone
      ipcRenderer.send('single-instruction', 'command');
      this.props.updateDroneConnectionStatus(droneConnectionStatus);
    });
  }

  connectToDroneHandler = () => {
    ipcRenderer.send('connect-to-drone');
  };

  startRecordingVideo = () => {
    ipcRenderer.send('start-recording');
  };

  stopRecordingVideo = () => {
    ipcRenderer.send('stop-recording');
  };

  flightCommandsIteratorReduxUpdater = async flightInstructions => {
    //Iterate over all flightInstructions
    for (let i = 0; i < flightInstructions.length; i++) {
      let animateInstruction = flightInstructions[i].drawInstruction;
      if (animateInstruction === 'takeoff') {
        this.props.updateCDP({
          x: this.props.startingPosition.x,
          y: this.props.startingPosition.y + 1,
          z: this.props.startingPosition.z,
        });
        await wait(commandDelays.takeoff);
        console.log('takeoff', animateInstruction);
      } else if (animateInstruction === 'land') {
        this.props.updateCDP({
          x: this.props.currentDronePosition.x,
          y: 0 + this.props.voxelSize * -0.5,
          z: this.props.currentDronePosition.z,
        });
        console.log('land', animateInstruction);
        setTimeout(() => {
          //After flight completes wait 10 seconds
          //Send drone model back to starting position
          this.props.updateCDP({
            x: this.props.startingPosition.x,
            y: this.props.startingPosition.y,
            z: this.props.startingPosition.z,
          });
          // this.setState({
          //   preVisButtonsDisabled: false,
          // });
          //  If user was recording, stop video encoding and stop streaming
          if (this.state.isRecording) {
            this.stopRecordingVideo();
          }
          //Give the 'Send drone model back to starting

          // this.props.togglePreVisualizeAnimation();
          this.props.updateCDR(Math.PI);
        }, 10000);
      } else if (Array.isArray(animateInstruction)) {
        //create new object for new coordinates
        let newCoords = {};
        const [z, x, y] = animateInstruction;
        // x -> z
        // y -> x
        // z -> y
        newCoords.x = this.props.currentDronePosition.x + x;
        newCoords.y = this.props.currentDronePosition.y + y;
        newCoords.z = this.props.currentDronePosition.z + z;

        this.props.updateCDP(newCoords);
        console.log('other', animateInstruction);

        //Wait for Command Delay
        await wait(commandDelays.go);
      } else {
        //Handle Rotation
        const [rotationDirection, rotationDegrees] = animateInstruction.split(
          ' '
        );

        const rotationDegreesNumber = Number(rotationDegrees);
        const rotationAngles = {
          90: Math.PI / 2,
          180: Math.PI,
          270: Math.PI + Math.PI / 2,
        };

        if (rotationDirection === 'cw') {
          const newCWRotation =
            this.props.currentDroneRotation -
            rotationAngles[rotationDegreesNumber];
          await this.props.updateCDR(newCWRotation);
        } else {
          const newCCWRotation =
            this.props.currentDroneRotation +
            rotationAngles[rotationDegreesNumber];
          await this.props.updateCDR(newCCWRotation);
        }
        await wait(commandDelays.cw);
      }
    }
  };

  runFlightInstructions = () => {
    //Diable Buttons
    this.setState({ runButtonsDisabled: true });
    //Prepare variables for flight
    const { flightInstructions } = this.props;
    const droneInstructions = flightInstructions.map(
      flightInstructionObj => flightInstructionObj.droneInstruction
    );
    //Fly drone
    ipcRenderer.send('autopilot', ['command', ...droneInstructions]);
    //Animate 3D drone model on Canvas
    this.flightCommandsIteratorReduxUpdater(this.props.flightInstructions);
  };

  runFlightInstructionsAndRecord = () => {
    //Disable Buttons
    this.setState({ runButtonsDisabled: true, isRecording: true });
    //Start Recording
    this.startRecordingVideo();
    //Prepare variables for flight
    const { flightInstructions } = this.props;
    const droneInstructions = flightInstructions.map(
      flightInstructionObj => flightInstructionObj.droneInstruction
    );
    //Wait 5 Seconds, then fly the drone (gives camera time to initialize)
    setTimeout(() => {
      //Fly drone
      ipcRenderer.send('autopilot', ['command', ...droneInstructions]);
      //Animate 3D drone model on Cavnas
      this.flightCommandsIteratorReduxUpdater(this.props.flightInstructions);
    }, 5000);
  };

  closeInvalidVideoTime = () => {
    this.setState({ invalidVideoTime: false });
  };

  render() {
    return (
      <div id="run-screen">
        <div className="row">
          <div className="row-item">
            <Header as="h1" dividing>
              <Icon name="paper plane" />
              <Header.Content>
                AutoPilot
                <Header.Subheader>
                  <i>Visualize your autopilot commands</i>
                </Header.Subheader>
              </Header.Content>
            </Header>
          </div>
          <div className="row-item">
            <Header as="h1" dividing>
              <Icon name="cloudscale" />
              <Header.Content>
                Drone Telemetry
                <Header.Subheader>
                  <i>Real-Time UAV Telemetry</i>
                </Header.Subheader>
              </Header.Content>
            </Header>
          </div>
        </div>
        <div className="row">
          <div className="row-item">
            <div className="canvas">
              <AutoPilotCanvas />
              <div className="legend">
                <Image
                  src={require('../assets/images/helper-images/legend.png')}
                />
              </div>
            </div>
          </div>
          <div id="autopilot-instructions">
            <Segment inverted>
              <List divided inverted animated>
                <List.Header
                  align="center"
                  className="autopilot-instructions-header"
                >
                  AUTOPILOT COMMANDS:
                </List.Header>
                {this.props.flightInstructions
                  .map(instructionObj => instructionObj.message)
                  .map((message, ind) => {
                    let icon;
                    if (message === 'Takeoff') {
                      icon = 'hand point up';
                    } else if (message === 'Land') {
                      icon = 'hand point down';
                    } else if (message === 'Hold') {
                      icon = 'hourglass half';
                    } else {
                      icon = 'dot circle';
                    }
                    return (
                      <List.Item
                        className="flight-message-single"
                        key={ind}
                        content={message}
                        icon={icon}
                      />
                    );
                  })}
              </List>
            </Segment>
          </div>
          <div className="row-item">
            <DroneTelemetry />
          </div>
        </div>
        <div className="row">
          <div className="row-item">
            <Header as="h1" dividing id="centered-padded-top">
              <Icon name="rocket" />
              <Header.Content>
                Run Flight
                <Header.Subheader>
                  <i>Fly your drone</i>
                </Header.Subheader>
              </Header.Content>
            </Header>
          </div>
          <div className="row-item">
            <Header as="h1" dividing id="centered-padded-top">
              <Icon name="video camera" />
              <Header.Content>
                Record Video
                <Header.Subheader>
                  {this.state.isRecording ? 'Recording: ' : null}
                  {this.state.isRecording ? (
                    <Icon name="circle" color="red" />
                  ) : (
                    'Record a video of your flight path'
                  )}
                </Header.Subheader>
              </Header.Content>
            </Header>
          </div>
        </div>
        <div className="row">
          <div className="row-item">
            <Button
              disabled={!this.props.droneConnectionStatus.isConnected}
              color="facebook"
              labelPosition="left"
              icon="military"
              content="Run Flight"
              onClick={this.runFlightInstructions}
            />
          </div>
          <div className="row-item">
            <Button
              disabled={!this.props.droneConnectionStatus.isConnected}
              color="facebook"
              labelPosition="left"
              icon="play"
              content="Record Flight"
              onClick={this.runFlightInstructionsAndRecord}
            />
          </div>
        </div>
        <div className="row">
          <div className="row-item">
            <StatusContainer />
          </div>
        </div>
      </div>
    );
  }
}

const mapState = state => {
  return {
    distance: state.distance,
    flightInstructions: state.flightInstructions,
    currentDronePosition: state.currentDronePosition,
    currentDroneRotation: state.currentDroneRotation,
    startingPosition: state.startingPosition,
    voxelSize: state.voxelSize,
    droneConnectionStatus: state.droneConnectionStatus,
  };
};

const mapDispatch = dispatch => {
  return {
    updateCDP: newPosition => {
      dispatch(updateCDP(newPosition));
    },
    updateCDR: newRotation => {
      dispatch(updateCDR(newRotation));
    },
    updateDroneConnectionStatus: droneStatus =>
      dispatch(updateDroneConnectionStatus(droneStatus)),
  };
};

export default connect(
  mapState,
  mapDispatch
)(AutoPilot);
