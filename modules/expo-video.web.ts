/**
 * Web stub for expo-video.
 * VideoView renders nothing and useVideoPlayer returns a no-op player on web.
 */
import React from 'react';
import { View, ViewProps } from 'react-native';

export interface VideoPlayer {
  loop: boolean;
  play: () => void;
  pause: () => void;
  replace: (source: string) => void;
}

export function useVideoPlayer(
  _source: string | null,
  _setup?: (player: VideoPlayer) => void
): VideoPlayer {
  return {
    loop: false,
    play: () => {},
    pause: () => {},
    replace: () => {},
  };
}

interface VideoViewProps extends ViewProps {
  player: VideoPlayer;
  allowsFullscreen?: boolean;
  allowsPictureInPicture?: boolean;
  contentFit?: string;
  nativeControls?: boolean;
}

export const VideoView = React.forwardRef<View, VideoViewProps>(
  ({ player: _player, allowsFullscreen: _a, allowsPictureInPicture: _b, contentFit: _c, nativeControls: _d, style, ...rest }, ref) => {
    return React.createElement(View, { ref, style, ...rest });
  }
);

VideoView.displayName = 'VideoView';
