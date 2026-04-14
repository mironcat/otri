// line intercept math by Paul Bourke http://paulbourke.net/geometry/pointlineplane/
// Determine the intersection point of two line segments
// Return FALSE if the lines don't intersect
// const D = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
// const x = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / D
// const y = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / D
function lineTolineIntersectionPoint({ x1, y1, x2, y2, x3, y3, x4, y4 }) {

  // Check if none of the lines are of length 0
  if ((x1 === x2 && y1 === y2) || (x3 === x4 && y3 === y4)) {
    return false
  }

  const denominator = ((y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1))

  // Lines are parallel
  if (denominator === 0) {
    return false
  }

  let ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denominator
  let ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denominator

  // is the intersection along the segments
  // if (ua < 0 || ua > 1 || ub < 0 || ub > 1) {
  //   debugger
  //   return false
  // }

  // Return a object with the x and y coordinates of the intersection
  let x = x1 + ua * (x2 - x1)
  let y = y1 + ua * (y2 - y1)

  return { x, y }
}
function getAngleBetweenPoints(x1, y1, x2, y2, x3, y3) {
  // https://snipp.ru/php/angle-3-points#link-js-funkciya
  return (Math.atan2(y3 - y1, x3 - x1) - Math.atan2(y2 - y1, x2 - x1)) * 180 / Math.PI;
}
function getLength(p, q) {
  // https://en.wikipedia.org/wiki/Euclidean_distance
  const a = p.x1 - q.x2;
  const b = p.y1 - q.y2;
  return Math.sqrt(a * a + b * b)
}
function getLengthByCoordinates({ x1, y1, x2, y2 }) {
  // https://en.wikipedia.org/wiki/Euclidean_distance
  const a = x1 - x2;
  const b = y1 - y2;
  return Math.sqrt(a * a + b * b)
}
function getParallelLine([p1x, p1y], [p2x, p2y], [nx, ny]) {
  let wx = (p2x - p1x) / 2;
  let wy = (p2y - p1y) / 2;
  return { st: { x: nx - wx, y: ny - wy }, en: { x: nx + wx, y: ny + wy } }
}
function getLineFromAnglePoint(AP, PMC1, PMC2, corner) {
  const tempLine = getParallelLine([PMC1.attr('cx'), PMC1.attr('cy')], [PMC2.attr('cx'), PMC2.attr('cy')], [AP.attr('cx'), AP.attr('cy')])
  tempLine.st = lineTolineIntersectionPoint({ x1: tempLine.st.x, y1: tempLine.st.y, x2: tempLine.en.x, y2: tempLine.en.y, x3: PMC1.attr('cx'), y3: PMC1.attr('cy'), x4: corner.x, y4: corner.y })
  tempLine.en = lineTolineIntersectionPoint({ x1: tempLine.st.x, y1: tempLine.st.y, x2: tempLine.en.x, y2: tempLine.en.y, x3: PMC2.attr('cx'), y3: PMC2.attr('cy'), x4: corner.x, y4: corner.y })
  // tempLine.st.x = PMC1.attr('cx')
  // tempLine.en.y = PMC2.attr('cy')
  return tempLine
}

function addMouseOverToPoint(point) {
  point.on('mouseover', () => point.stroke({ color: 'cyan', opacity: 0.7, width: 3 }))
  point.on('mouseout', () => point.stroke({ width: 0 }))
  return point
}
export { lineTolineIntersectionPoint, getAngleBetweenPoints, getLength, getLengthByCoordinates, addMouseOverToPoint, getLineFromAnglePoint };
