interface KDNode {
  point: number[];
  value: any;
  left: KDNode | null;
  right: KDNode | null;
  dimension: number;
}

export class KDTree {
  private root: KDNode | null = null;
  private dimensions: number;

  constructor(dimensions: number) {
    this.dimensions = dimensions;
  }

  /**
   * Insert a point with an associated value into the tree
   * @param point The point coordinates as an array of numbers
   * @param value The value associated with this point
   */
  insert(point: number[], value: any): void {
    if (point.length !== this.dimensions) {
      throw new Error(`Point must have ${this.dimensions} dimensions`);
    }

    const newNode: KDNode = {
      point,
      value,
      left: null,
      right: null,
      dimension: 0,
    };

    if (!this.root) {
      this.root = newNode;
      return;
    }

    let current = this.root;
    let depth = 0;

    while (true) {
      const dim = depth % this.dimensions;
      if (point[dim] < current.point[dim]) {
        if (current.left === null) {
          newNode.dimension = (dim + 1) % this.dimensions;
          current.left = newNode;
          break;
        }
        current = current.left;
      } else {
        if (current.right === null) {
          newNode.dimension = (dim + 1) % this.dimensions;
          current.right = newNode;
          break;
        }
        current = current.right;
      }
      depth++;
    }
  }

  /**
   * Find the k nearest neighbors to a given point
   * @param point The query point
   * @param k Number of nearest neighbors to find
   * @returns Array of [distance, value] pairs
   */
  findNearest(point: number[], k: number): Array<[number, any]> {
    if (point.length !== this.dimensions) {
      throw new Error(`Query point must have ${this.dimensions} dimensions`);
    }

    if (!this.root) {
      return [];
    }

    const nearestPoints = new Array<[number, any]>();
    this.findNearestHelper(this.root, point, k, nearestPoints, 0);

    // Sort by distance and return k nearest
    return nearestPoints.sort(([a], [b]) => a - b).slice(0, k);
  }

  private findNearestHelper(
    node: KDNode | null,
    point: number[],
    k: number,
    nearest: Array<[number, any]>,
    depth: number
  ): void {
    if (!node) return;

    const dim = depth % this.dimensions;
    const distance = this.calculateDistance(point, node.point);

    // Add current point to nearest if we haven't found k points yet
    // or if it's closer than our furthest nearest neighbor
    if (nearest.length < k) {
      nearest.push([distance, node.value]);
    } else {
      const maxDist = Math.max(...nearest.map(([d]) => d));
      if (distance < maxDist) {
        const maxIndex = nearest.findIndex(([d]) => d === maxDist);
        nearest[maxIndex] = [distance, node.value];
      }
    }

    // Recursively search the half of the tree that contains the target
    const nextNode = point[dim] < node.point[dim] ? node.left : node.right;
    this.findNearestHelper(nextNode, point, k, nearest, depth + 1);

    // If we haven't found k points yet, or if there could be points
    // on the other side of the splitting plane that are closer to
    // the target than what we've found so far, look on the other side
    const maxDist =
      nearest.length < k ? Infinity : Math.max(...nearest.map(([d]) => d));
    if (Math.abs(point[dim] - node.point[dim]) < maxDist) {
      const otherNode = point[dim] < node.point[dim] ? node.right : node.left;
      this.findNearestHelper(otherNode, point, k, nearest, depth + 1);
    }
  }

  /**
   * Calculate Euclidean distance between two points
   */
  private calculateDistance(point1: number[], point2: number[]): number {
    return Math.sqrt(
      point1.reduce((sum, coord, i) => {
        const diff = coord - point2[i];
        return sum + diff * diff;
      }, 0)
    );
  }

  /**
   * Remove all points from the tree
   */
  clear(): void {
    this.root = null;
  }

  /**
   * Get the total number of points in the tree
   */
  size(): number {
    return this.calculateSize(this.root);
  }

  private calculateSize(node: KDNode | null): number {
    if (!node) return 0;
    return 1 + this.calculateSize(node.left) + this.calculateSize(node.right);
  }
}
