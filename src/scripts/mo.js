import { lineTolineIntersectionPoint, getAnglePoints, getLengthByCoordinates } from '@/scripts/utils.js'
/*
Drawing steps
draw all objects
  - baseFrame with frameResizer
  depending on concave_vs:
    - PMC points
    - tangent PMC points with connection lines
    -

*/
import makeTriangle from '@/scripts/triangles.js';
export default function measureObjects({ id, draw, om, scales, bus }) {
  let mainGroup = draw.group().attr({ id: 'mainGroup' })
  const defaultParams = { //default Base Frame Size
    baseFrame: { x: 0, y: 0, width: 350, height: 200 }
  }
  function initDefault() {

  }
  function initDefault() {

  }
}
