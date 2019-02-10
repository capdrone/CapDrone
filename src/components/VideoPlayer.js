import React, { Component } from 'react';

class Video extends Component {
  render() {
    const { video } = this.props;
    let url = null;
    if (video) {
      url = require(`../videos/${this.props.video}`);
    }
    return (
      <div id="video-player">
        <video loop controls src={url} width="960px" height="720px" />
      </div>
    );
  }
}

export default Video;
