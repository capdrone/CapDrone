import React, { Component } from 'react';
import { connect } from 'react-redux';
import StatusContainer from '../components/StatusContainer';
import DroneTelemetry from '../components/DroneTelemetry';
import Canvas from '../components/Canvas';
import Stream from '../components/Stream';
import { Button } from 'semantic-ui-react';
import { drawPath } from '../utils/drawPathUtils';

const { ipcRenderer } = window.require('electron');
class Run extends Component {
  connectToDroneHandler = () => {
    ipcRenderer.send('connect-to-drone');
  };

  streamVideo = () => {
    ipcRenderer.send('enable-video-stream', 'streamon');
  };

  stopStreamingVideo = () => {
    ipcRenderer.send('disable-video-stream', 'streamoff');
  };

  componentDidMount() {
    drawPath(this.props.flightInstructions, this.props.distance);
  }

  render() {
    return (
      <div id="run">
        <h1>Run 3D Model</h1>
        <table>
          <tr>
            <td>
              <Canvas />
            </td>
            <td>
              <Stream />
            </td>
          </tr>
          <tr>
            <td>
              <DroneTelemetry />
            </td>
            <td>
              <StatusContainer />
            </td>
          </tr>
          <tr>
            <td>
              <Button onClick={() => this.streamVideo()}>Stream Video</Button>
              <Button onClick={() => this.stopStreamingVideo()}>
                Stop Stream
              </Button>
            </td>
          </tr>
        </table>
      </div>
    );
  }
}

const mapState = state => {
  return {
    distance: state.distance,
    flightInstructions: state.flightInstructions,
  };
};

export default connect(
  mapState,
  null
)(Run);
