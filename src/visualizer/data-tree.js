'use strict'

const sinusoidalDecimal = require('sinusoidal-decimal')
const getNoDataNode = require('./no-data-node.js')
const d3 = require('./d3.js')

function flameGradient (decimal) {
  const red = Math.round(255 * sinusoidalDecimal(decimal, -0.5, 0.5, true))
  const green = Math.round(255 * sinusoidalDecimal(decimal, 0.2, 1.0, true))
  const blue = Math.round(255 * sinusoidalDecimal(decimal, -0.7, 1.0, true))

  return `rgb(${red}, ${green}, ${blue})`
}

class DataTree {
  constructor (tree) {
    // Set a reasonable upper limit to displayed name; exact name matching is done in analysis
    this.appName = tree.appName && tree.appName.length > 30 ? tree.appName.slice(0, 30) + '…' : tree.appName
    this.pathSeparator = tree.pathSeparator

    // Save code ares
    this.codeAreas = tree.codeAreas

    // Prepare the data
    this.data = tree.data
    this.dataNodes = flatten(this.data.children)
    this.total = this.data.value
    this.sortedAllocations = null

    // Bind some utility functions
    this.exclude = new Set(['all-v8:v8', 'all-v8:cpp', 'all-v8:native', 'all-v8:regexp', 'is:init'])
  }

  update (initial) {
    this.sortAllocations()
    this.mean = d3.mean(this.sortedAllocations, node => node.selfValue / this.total)
    this.calculateRoots([this.data, ...this.dataNodes])
  }

  show (name) {
    if (this.exclude.has(name)) {
      this.exclude.delete(name)
      return true
    }

    return false
  }

  hide (name) {
    if (!this.exclude.has(name)) {
      this.exclude.add(name)
      return true
    }
    return false
  }

  activeTree () {
    return this.data
  }

  activeNodes () {
    return this.dataNodes
  }

  countFrames () {
    return this.sortedAllocations.length
  }

  getNodeById (id) {
    const arr = this.activeNodes()
    return arr.find(node => node.id === id)
  }

  getNodeValue (node) {
    if (this.isNodeExcluded(node)) {
      // Value of hidden frames is the sum of their visible children
      return node.children
        ? node.children.reduce((acc, child) => {
          return acc + this.getNodeValue(child)
        }, 0)
        : 0
    }

    return node.selfValue
  }

  getTypeKey (node) {
    return `${node.category}:${node.type}`
  }

  getFlattenedSorted (sorter, arr) {
    const filtered = arr.filter(node => !this.isNodeExcluded(node))
    if (filtered.length) return filtered.sort(sorter)
    return [getNoDataNode()]
  }

  getSortPosition (node) {
    return this.sortedAllocations.indexOf(node)
  }

  getHeatColor (node, arr = this.sortedAllocations) {
    try {
      if (!node || node.type === 'no-data' || node.isRoot || this.isNodeExcluded(node) || this.mean === 0) {
        return 'rgb(0, 0, 0)'
      }

      const pivotPoint = this.mean / (this.mean + this.maxAboveAdjusted + this.maxBelowAdjusted)

      if (node.adjustedPercentage === 0) {
        return flameGradient(pivotPoint)
      }

      if (node.adjustedPercentage > this.mean) {
        return flameGradient(pivotPoint + (node.adjustedPercentage / this.maxAboveAdjusted) * (0.95 - pivotPoint))
      } else {
        return flameGradient(pivotPoint - (node.adjustedPercentage / this.maxBelowAdjusted) * pivotPoint)
      }
    } catch (e) {
      console.error('Cannot compute heat color for node', node)
      throw new Error('Cannot compute heat color for node')
    }
  }

  getFrameByRank (rank, arr) {
    return this.sortedAllocations[rank]
  }

  getAllocationsSorter () {
    return (nodeA, nodeB) => {
      const topA = nodeA.selfValue
      const topB = nodeB.selfValue

      return topB - topA
    }
  }

  getVisibleChildren (node) {
    // Can pass in data nodes or D3 partition nodes; gets closest visible descendents of same type

    let nextVisibleDescendents = []
    const childCount = node.children ? node.children.length : 0
    for (let i = 0; i < childCount; i++) {
      const child = node.children[i]
      if (this.isNodeExcluded(child.data || child)) {
        nextVisibleDescendents = nextVisibleDescendents.concat(this.getVisibleChildren(child))
      } else {
        nextVisibleDescendents.push(child)
      }
    }
    return nextVisibleDescendents
  }

  sortAllocations (customRootNode) {
    if (customRootNode) {
      // Flattened tree, sorted hottest first, including the root node
      const frames = flatten(customRootNode.children)
      this.sortedAllocations = this.getFlattenedSorted(this.getAllocationsSorter(), [customRootNode].concat(frames))
    } else {
      this.sortedAllocations = this.getFlattenedSorted(this.getAllocationsSorter(), this.activeNodes())
    }
  }

  calculateRoots (arr) {
    // Used to give a reasonable flame gradient range above and below the mean value
    let maxAboveAdjusted = 0
    let maxBelowAdjusted = 0

    const count = arr.length
    for (let i = 0; i < count; i++) {
      const node = arr[i]
      const percentage = node.selfValue / this.total

      if (percentage > this.mean) {
        node.adjustedPercentage = Math.sqrt(percentage - this.mean)

        if (node.adjustedPercentage > maxAboveAdjusted) {
          maxAboveAdjusted = node.adjustedPercentage
        }
      } else if (percentage < this.mean) {
        node.adjustedPercentage = Math.sqrt(this.mean - percentage)

        if (node.adjustedPercentage > maxBelowAdjusted) {
          maxBelowAdjusted = node.adjustedPercentage
        }
      } else {
        // Exactly equals mean
        node.adjustedPercentage = 0
      }
    }

    this.maxAboveAdjusted = maxAboveAdjusted
    this.maxBelowAdjusted = maxBelowAdjusted
  }

  isNodeExcluded (node) {
    return (
      (node.isInit && this.exclude.has('is:init')) ||
      (node.isInlinable && this.exclude.has('is:inlinable')) ||
      this.exclude.has(node.category) ||
      // Namespace types by category in case someone installs a dependency named 'cpp' etc
      this.exclude.has(`${node.category}:${node.type}`)
    )
  }
}

function flatten (children) {
  // Flatten the tree, excluding the root node itself (i.e. the 'all stacks' node)
  return children.reduce((accu, c) => accu.concat(c, c.children && c.children.length ? flatten(c.children) : []), [])
}

module.exports = DataTree
