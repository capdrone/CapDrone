import React, { Component } from 'react';
import { Grid, Header, Icon, List, Segment } from 'semantic-ui-react';
import VideoPlayer from '../components/VideoPlayer';
import Slider from 'react-slick';

const { ipcRenderer } = window.require('electron');

class Videos extends Component {
  constructor() {
    super();
    this.state = {
      availableVideos: [],
      selectedVideo: null,
    };

    ipcRenderer.send('get-available-videos');
    ipcRenderer.on('has-available-videos', (evt, videos) => {
      this.setState({ availableVideos: videos, selectedVideo: videos[1] });
    });
  }
  handleVideoClick = (e, { name }) => {
    this.setState({ selectedVideo: name });
  };

  render() {
    const { availableVideos } = this.state;
    return (
      <div id="videos">
        <Grid centered padded>
          <Grid.Row>
            <Header as="h1" dividing>
              <Header.Content className="centered-padded-top">
                <Icon name="video" />
                Videos
                <Header.Subheader>
                  <i>Watch your recorded drone footage</i>
                </Header.Subheader>
              </Header.Content>
            </Header>
          </Grid.Row>

          <Grid.Row>
            <Grid.Column>
              <VideoPlayer video={this.state.selectedVideo} />
            </Grid.Column>
          </Grid.Row>

          <Grid.Row>
            <Segment textAlign="center" compact id="video-list" inverted>
              <List link>
                <List.Header>
                  <font color="yellow">
                    <h1>Your Videos</h1>
                  </font>
                  <hr width="50%" />
                </List.Header>
                {availableVideos
                  .slice(1)
                  .reverse()
                  .map(video => {
                    return (
                      <List.Item
                        // className="video-single"
                        key={video}
                        as="a"
                        name={video}
                        onClick={this.handleVideoClick}
                      >
                        {video.slice(0, -4)}
                      </List.Item>
                    );
                  })}
              </List>
            </Segment>
          </Grid.Row>
        </Grid>
      </div>
    );
  }
}

export default Videos;
