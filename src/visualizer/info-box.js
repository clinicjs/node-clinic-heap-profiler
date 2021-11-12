'use strict'
const d3 = require('./d3.js')
const HtmlContent = require('./html-content.js')
const getNoDataNode = require('./no-data-node.js')
const caretUpIcon = require('@clinic/clinic-common/icons/caret-up')

const stripTags = html => html.replace(/(<([^>]+)>)/gi, '')

const addResponsiveSpan = str => `<span class="visible-md">${str}</span>`

const wrapTooltipText = text =>
  d3.create('span').classed('tooltip-default-message frame-tooltip', true).text(text).node()

class InfoBox extends HtmlContent {
  constructor (parentContent, contentProperties = {}) {
    super(parentContent, contentProperties)
    this.tooltip = contentProperties.customTooltip

    const { functionName, fileName } = getNoDataNode()

    this.functionText = functionName
    this.pathHtml = fileName
    this.areaHtml = 'Processing data...'
    this.selfAllocationPercentage = 0

    this.addCollapseControl(true, {
      classNames: 'frame-dropdown',
      htmlElementType: 'button',
      htmlContent: `<span>0%</span> ${caretUpIcon}`
    })
  }

  initializeElements () {
    super.initializeElements()

    // Initialize frame info
    this.d3FrameInfo = this.d3Element.append('div').classed('frame-info', true).classed('panel', true)

    this.d3FrameFunction = this.d3FrameInfo
      .append('strong')
      .classed('frame-info-item', true)
      .classed('frame-function', true)
    this.tooltip.attach({
      msg: () => wrapTooltipText(this.functionText),
      d3TargetElement: this.d3FrameFunction
    })

    this.d3FramePath = this.d3FrameInfo.append('span').classed('frame-info-item', true).classed('frame-path', true)
    this.tooltip.attach({
      msg: () => wrapTooltipText(stripTags(this.pathHtml)),
      d3TargetElement: this.d3FramePath
    })

    this.d3FrameArea = this.d3FrameInfo.append('span').classed('frame-info-item', true).classed('frame-area', true)
    this.tooltip.attach({
      msg: () => wrapTooltipText(stripTags(this.areaHtml)),
      d3TargetElement: this.d3FrameArea
    })

    this.d3StackInfoTitle = this.d3ContentWrapper.append('h2').text('Allocation info')

    this.d3SelfAllocation = this.d3ContentWrapper
      .append('p')
      .classed('frame-percentage', true)
      .classed('frame-percentage-top', true)
      .text('Self Allocations: 0 MB')

    this.d3TotalAllocation = this.d3ContentWrapper
      .append('p')
      .classed('frame-percentage', true)
      .classed('frame-percentage-top', true)
      .text('Total Allocations: 0 MB')

    this.d3CollapseButton = this.collapseControl.d3Element.attr('title', 'Show allocation info')

    // Close when the user clicks outside the options menu.
    document.body.addEventListener(
      'click',
      event => {
        if (
          !this.collapseClose.isCollapsed &&
          !this.d3CollapseButton.node().contains(event.target) &&
          !this.d3ContentWrapper.node().contains(event.target)
        ) {
          this.collapseClose()
        }
      },
      true
    )
  }

  contentFromNode (node) {
    if (!node) {
      console.error('`node` argument cannot be undefined/null')
      return
    }

    this.isRootNode = node.isRoot

    // Todo: Use visibleRootValue when ready
    const totalValue = this.ui.dataTree.total

    const nodeValue = node.selfValue + node.childrenValue
    this.selfAllocationValue = this.toMB(node.selfValue)
    this.selfAllocationPercentage = this.toPercentage(node.selfValue, totalValue)

    if (nodeValue > node.selfValue) {
      this.totalAllocationValue = this.toMB(nodeValue)
      this.totalAllocationPercentage = this.toPercentage(nodeValue, totalValue)
    } else {
      this.totalAllocationPercentage = this.totalAllocationValue = 0
    }

    this.functionText = node.functionName
    this.pathHtml = ''

    if (node.fileName) {
      const fileNameParts = (node.fileName || '').split('/')
      const baseName = fileNameParts.pop()
      const prefix = fileNameParts.join('/')

      if (node.type === 'no-data') {
        this.pathHtml = node.fileName
      } else {
        this.pathHtml = `${addResponsiveSpan(`${prefix}/`)}${baseName}`
      }
    }

    this.collapseControl.isHidden = node.type === 'no-data'

    if (node.lineNumber && node.columnNumber) {
      // Two spaces (in <pre> tag) so this is visually linked to but distinct from main path, including when wrapped
      this.pathHtml += `<span class="frame-line-col">${addResponsiveSpan('  line')}:${
        node.lineNumber
      }${addResponsiveSpan(' column')}:${node.columnNumber}</span>`
    }

    this.rankNumber = this.ui.dataTree.getSortPosition(node)

    const typeLabel =
      node.category === 'core' ? '' : ` (${this.ui.getLabelFromKey(`${node.category}:${node.type}`, true)})`
    const categoryLabel = this.ui.getLabelFromKey(node.category, true)

    this.areaHtmlColour = this.ui.getFrameColor(
      {
        category: node.category
      },
      'foreground',
      false
    )

    // e.g. The no-data-node has an .areaText containing a custom message
    this.areaHtml = node.areaText || `${addResponsiveSpan(`In ${categoryLabel} `)}${typeLabel}`

    if (node.isInit) this.areaHtml += '. In initialization process'
    if (node.isInlinable) this.areaHtml += '. Inlinable'
    if (node.isUnoptimized) this.areaHtml += '. Unoptimized'
    if (node.isOptimized) this.areaHtml += '. Optimized'

    this.areaHtml += addResponsiveSpan('.')

    this.draw()
  }

  showNodeInfo (node) {
    this.contentFromNode(node)
  }

  draw () {
    super.draw()

    if (this.isRootNode) {
      this.d3FrameFunction.text('All allocations')

      this.d3FramePath.html('')

      this.d3FrameArea.html('')

      this.d3CollapseButton.select('span').text('100 %')

      this.d3SelfAllocation.text('')

      this.d3TotalAllocation.text(`Total Allocations: ${this.totalAllocationValue} MB`)
    } else {
      this.d3FrameFunction.text(this.functionText)

      this.d3FramePath.html(this.pathHtml)

      this.d3FrameArea.html(this.areaHtml).style('color', this.areaHtmlColour)

      if (this.totalAllocationPercentage > 0) {
        this.d3CollapseButton
          .select('span')
          .text(`${this.selfAllocationPercentage} % (${this.totalAllocationPercentage} %)`)
      } else {
        this.d3CollapseButton.select('span').text(`${this.selfAllocationPercentage} %`)
      }

      this.d3SelfAllocation.text(`Self Allocations: ${this.selfAllocationValue} MB`)

      if (this.totalAllocationValue > 0) {
        this.d3TotalAllocation.text(`Total Allocations: ${this.totalAllocationValue} MB`)
      } else {
        this.d3TotalAllocation.text('')
      }
    }
  }

  toMB (value) {
    /*
      Here we are complying with Chrome Dev Tools and  with the Internation system of units, where M is 1000 x 1000.
      See: https://en.wikipedia.org/wiki/Megabyte
    */
    return (value / 1e6).toFixed(3)
  }

  toPercentage (fraction, total) {
    return (100 * (fraction / total)).toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
  }
}

module.exports = InfoBox
