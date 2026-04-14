// import { SVG } from '@svgdotjs/svg.js'
// let draw = SVG()
import { getLength } from './utils.js'
function initScalebar(scalebar, draw, scales) {

  const scale_length = scales.length
  // console.log(scale_length)
  const scalebar_resizer = draw.group().attr({ id: 'scalebar-resizer' })
  const scalebar_line = draw.line(5, 5, 95, 5).stroke({ color: 'red', width: 5, linecap: 'butt' })
  const scalebar_start = draw.rect(12, 12).fill('red').opacity(.3).draggable().move(0, 0)
  const scalebar_end = draw.rect(12, 12).fill('red').opacity(.3).draggable().move(90, 0)
  const scalebar_label = draw.text(scale_length).font({ fill: 'red' }).move(105, 0)
  scalebar_resizer.add(scalebar_line).add(scalebar_start).add(scalebar_end).add(scalebar_label).draggable().move(850, 540)
  const scalebar_burned = draw.group().attr({ id: 'scalebar-burned' })
  const scalebar_base = draw.rect(100, 5).fill('gray')
  const scalebar_blabel = draw.text("!!!!").font({ fill: 'red' }).move(40, -15)
  scalebar_burned.add(scalebar_base).add(scalebar_blabel).move(10, 570)
  scalebar.remove()
  scalebar = draw.group().attr({ id: 'scalebar-main' }).add(scalebar_resizer).add(scalebar_burned)
  scalebar_start.on('dragmove.namespace', function (event) {
    var coords = scalebar_start.attr(['x', 'y'])
    // scalebar_base.plot(coords.x+5, coords.y+5)
    scalebar_line.attr({ x1: coords.x + 6, y1: coords.y + 6 })
  })
  scalebar_end.on('dragmove.namespace', function (event) {
    var coords = scalebar_end.attr(['x', 'y'])
    scalebar_line.attr({ x2: coords.x + 6, y2: coords.y + 6 })
    scalebar_label.attr({ x: coords.x + 15, y: coords.y })
    // scalebar_length.value = scalebar_base.length()
  })
  return scalebar
}
function getScalebarLength(scalebar, scales) {
  const s_resizer = scalebar.get(0)
  const s_burned = scalebar.get(1)
  const scalebar_line = s_resizer.get(0)
  const scalebar_label = s_resizer.get(3)
  const scalebar_base = s_burned.get(0).fill('green')
  const scalebar_blabel = s_burned.get(1)
  scalebar_label.text(scales.value.length)
  scalebar_blabel.text(scales.value.length).font({ fill: 'green' })
  const length = getLength(scalebar_line.attr(['x1', 'y1']), scalebar_line.attr(['x2', 'y2']))
  // console.log(length)
  scalebar_base.width(length * scales.value.zoom)
  return length
}

export { initScalebar, getScalebarLength }
