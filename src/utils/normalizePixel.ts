// TODO: move this to layout context.

import {Dimensions, PixelRatio} from 'react-native';
const {width, height} = Dimensions.get('window');

/**
 * Converts regular hard react-native dp to
 * device relative  size based on horizontal and vertical dimensions
 */

// base values from iPhone 8
let baseWidth = 375;
let baseHeight = 667;
let baseRatio = baseHeight / baseWidth; // 1.7786666666666;

let ratio = height / width;
let scale = ((ratio / baseRatio) * width) / baseWidth;
function px(pixelSize = 1) {
  // /return PixelRatio.getPixelSizeForLayoutSize(pixelSize);
  return scale * pixelSize;
}

export default px;