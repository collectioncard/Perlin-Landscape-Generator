import { Scene } from "phaser";

// @ts-ignore
import { Noise } from "noisejs";
// @ts-ignore
import tracery from "tracery-grammar";

import EasyStar from "easystarjs";

const TILESIZE: number = 16;

interface Group {
  leader: [number, number];
  members: [number, number][];
  label?: Phaser.GameObjects.Text;
  hasConnection?: boolean;
  paths?: pathInfo[];
}

const GRASS = 18;
const DIRT = 12;
const SAND = 6;
const WATER = 0;

let phaserMap: any;

interface pathInfo {
  path: any;
  distance: number;
}

const grammar = tracery.createGrammar({
  townName: [
    "#prefix##suffix#",
    "#prefix##name#",
    "#adjective# #place#",
    "#name##suffix#",
  ],
  prefix: [
    "San",
    "Green",
    "Silver",
    "Red",
    "Iron",
    "Santa",
    "New",
    "Old",
    "East",
    "West",
    "North",
    "South",
    "Port",
    "Saint",
    "Fort",
    "Mount",
    "Spring",
    "Summer",
    "Winter",
    "Autumn",
    "Golden",
    "Crystal",
    "Emerald",
    "Ruby",
    "Sapphire",
    "Diamond",
    "Pearl",
    "Lavender",
  ],
  suffix: [
    "town",
    "vale",
    "burg",
    "ridge",
    "haven",
    "ford",
    "ham",
    "ton",
    "field",
    "wood",
    "bridge",
    "port",
    "mouth",
  ],
  adjective: [
    "Lonely",
    "Silent",
    "Forgotten",
    "Shimmering",
    "Windy",
    "Breezy",
    "Sunny",
    "Rainy",
    "Misty",
    "Foggy",
    "Snowy",
    "Icy",
    "Hot",
    "Cold",
    "Warm",
    "Gloomy",
    "Dark",
    "Bright",
    "Glowing",
    "Shining",
    "Dusty",
    "Sandy",
    "Rocky",
    "Muddy",
    "Leafy",
    "Flowery",
    "Grassy",
    "Mossy",
    "Soggy",
    "Dry",
    "Wet",
    "Damp",
    "Chilly",
    "Cool",
    "Stormy",
    "Calm",
    "Peaceful",
    "Quiet",
    "Busy",
    "Active",
    "Sleepy",
  ],
  place: ["Atoll", "Peak", "Valley", "Shore", "Island"],
  name: [
    "Haven",
    "Wood",
    "Bridge",
    "Field",
    "Grove",
    "Cruz",
    "Barbara",
    "Diego",
  ],
});

export class scene1 extends Scene {
  noise: Noise = new Noise(Math.random());

  currentZoomLevel: number = 6;

  mapWidth: number = 40;
  mapHeight: number = 40;

  //autozoom stuff
  shouldAutoZoom: boolean = false;
  isAutoZoomingIn: boolean = true;

  easyStar: EasyStar.js = new EasyStar.js();

  constructor() {
    super("scene1");
  }

  preload(): void {
    this.load.image("tiles", "assets/basicTileset/basicSheet.png");

    //Initialize EasyStar//

    //Allow sand, dirt, and grass tiles
    this.easyStar.setAcceptableTiles([SAND, DIRT, GRASS]);

    this.easyStar.setTileCost(SAND, 10); // Sand is hard to walk on
    this.easyStar.setTileCost(DIRT, 2); // Dirt is fine
    this.easyStar.setTileCost(GRASS, 1); // Grass is the best
  }

  create(): void {
    //Generate a map to display on the first load
    this.generateCompleteMap();

    //Input Handling//
    this.input.keyboard!.on(
      "keydown-Z",
      () => (this.shouldAutoZoom = !this.shouldAutoZoom),
    );

    this.input.keyboard!.on("keydown-PERIOD", () => this.zoomMap(0.1));

    this.input.keyboard!.on("keydown-COMMA", () => this.zoomMap(-0.1));

    this.input.keyboard!.on("keydown-R", () => {
      this.noise = new Noise(Math.random());
      this.generateCompleteMap();
      this.scene.restart();
    });
  }

  update(): void {
    if (this.shouldAutoZoom) {
      this.autoZoom();
    }
  }

  ////************Map Generation************////

  //Generates a complete map with named areas and roads. Returns a 2D array of tile data.
  generateCompleteMap(): { worldMap: number[][]; groups: Group[] } {
    //Generate the base map from perlin noise
    let worldMap: number[][] = this.generateNoiseMap();

    //Draw the map on the screen
    const map = this.make.tilemap({
      data: worldMap,
      tileWidth: TILESIZE,
      tileHeight: TILESIZE,
    });
    const tiles = map.addTilesetImage("tiles");
    phaserMap = map.createLayer(0, tiles!, 0, 0);

    //Give easystar the map
    this.easyStar.setGrid(worldMap);

    //Group the tiles into clusters
    const groups: Group[] = this.groupTiles(worldMap, GRASS, true);
    const groups2: Group[] = this.groupTiles(worldMap, DIRT, true);
    const groups1: Group[] = this.groupTiles(worldMap, SAND, true);

    //Label each group with a town name
    this.labelGroups(groups);

    //Draw roads between each group leader
    this.buildRoads(groups);

    return { worldMap, groups: [] };
  }

  //Creates a 2D array of normalized values using perlin noise.
  //The values are between 0 and 3 for each tile type.
  generateNoiseMap(): number[][] {
    //The max and min values that the noise should be normalized to.
    const [normalizedMax, normalizedMin]: [number, number] = [10, 0];

    const noiseMap: number[][] = new Array(this.mapWidth)
      .fill(0)
      .map(() => new Array(this.mapHeight));

    let highestNoiseValue: number = -1;

    //Populate the noise map with perlin noise values.
    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        noiseMap[x][y] = Math.abs(
          this.noise.perlin2(
            (x * 0.01 + 0.01) * this.currentZoomLevel,
            (y * 0.01 + 0.01) * this.currentZoomLevel,
          ),
        );
        if (noiseMap[x][y] > highestNoiseValue) {
          highestNoiseValue = noiseMap[x][y];
        }
      }
    }

    //Normalize the noise values to be between the min and max values.
    for (let x = 0; x < this.mapWidth; x++) {
      for (let y = 0; y < this.mapHeight; y++) {
        let normalizedValue: number =
          (normalizedMax - normalizedMin) *
            ((noiseMap[x][y] - normalizedMin) /
              (highestNoiseValue - normalizedMin)) +
          normalizedMin;

        if (normalizedValue < 2) {
          normalizedValue = WATER;
        } else if (normalizedValue < 4) {
          normalizedValue = SAND;
        } else if (normalizedValue < 6) {
          normalizedValue = DIRT;
        } else {
          normalizedValue = GRASS;
        }

        noiseMap[x][y] = normalizedValue;
      }
    }

    return noiseMap;
  }

  //Finds all tiles with a given ID that form clusters. Returns an array of those groups containing the leader and members.
  // Optionally replaces group edges with transition tiles (WIP)
  groupTiles(
    tileMap: number[][],
    tileID: number,
    drawBorders: boolean = false,
  ): Group[] {
    const tileDirections: [number, number][] = [
      [0, -1], // Up
      [0, 1], // Down
      [-1, 0], // Left
      [1, 0], // Right
    ];

    console.log(drawBorders);

    const vistedTiles = new Array(this.mapWidth)
      .fill(0)
      .map(() => new Array(this.mapHeight));

    const foundGroups: Group[] = [];

    //DFS on adjacent tiles to find groups of the same tile type.
    const dfs = (x: number, y: number, group: Group) => {
      if (
        x < 0 ||
        y < 0 ||
        x >= this.mapWidth ||
        y >= this.mapHeight ||
        vistedTiles[x][y]
      ) {
        return;
      }

      if (tileMap[x][y] !== tileID) {
        if (drawBorders && tileMap[x][y] < tileID) {
          //We have a border, draw it

          return;
        } else {
          return;
        }
      }

      vistedTiles[x][y] = true;
      group.members.push([x, y]);

      for (const [dx, dy] of tileDirections) {
        dfs(x + dx, y + dy, group);
      }
    };

    //Finds a decent approximation of the center tile in a group. Not perfect but good enough I guess
    function findCenterTile(members: [number, number][]): [number, number] {
      let sumX = 0,
        sumY = 0;

      //Calculate the center coordinate
      for (const [x, y] of members) {
        sumX += x;
        sumY += y;
      }

      const centerX = Math.floor(sumX / members.length);
      const centerY = Math.floor(sumY / members.length);

      // Second pass: Find the closest tile to the center
      return members.reduce((closestTile, [x, y]) => {
        const distance = Math.hypot(centerX - x, centerY - y);
        const closestDistance = Math.hypot(
          centerX - closestTile[0],
          centerY - closestTile[1],
        );
        return distance < closestDistance ? [x, y] : closestTile;
      }, members[0]);
    }

    for (let x: number = 0; x < this.mapWidth; x++) {
      for (let y: number = 0; y < this.mapHeight; y++) {
        if (!vistedTiles[x][y] && tileMap[x][y] === tileID) {
          const group: Group = {
            leader: [x, y],
            members: [],
          };

          dfs(x, y, group);

          //Find the center tile of the group
          group.leader = findCenterTile(group.members);

          foundGroups.push(group);
        }
      }
    }

    //loop through groups and draw the borders
    if (drawBorders) {
      foundGroups.forEach((group) => {
        group.members.forEach(([x, y]) => {
          this.doBorderTiles(x, y);
        });
      });
    }

    return foundGroups;
  }

  //Puts a label on the leader of each group of tiles using Tracery
  labelGroups(groups: Group[]): void {
    groups.forEach((group) => {
      const [leaderX, leaderY] = group.leader;
      //(tile.x / 4) * TILESIZE + 8
      group.label = this.add.text(
        leaderY * TILESIZE + 8,
        leaderX * TILESIZE + 8,
        grammar.flatten("#townName#"),
        {
          fontSize: "12px",
          // @ts-ignore
          fill: "#ffffff",
          align: "center",
          stroke: "#000000",
          strokeThickness: 4,
        },
      );
      group.label.setDepth(100);

      group.label.setOrigin(0.5, 0.5);
    });
  }

  //Creates a road network between all possible group leaders
  async buildRoads(groups: Group[]): Promise<void> {
    const edges: {
      group1: Group;
      group2: Group;
      path: { x: number; y: number }[];
      distance: number;
    }[] = [];

    //Start A* pathfinding on all groups and add each of their async promises to a const to track
    const pathPromises = groups.flatMap((group1, i) =>
      groups.slice(i + 1).map(
        (group2) =>
          new Promise<void>((resolve) => {
            const [startY, startX] = group1.leader;
            const [endY, endX] = group2.leader;

            this.easyStar.findPath(startX, startY, endX, endY, (path) => {
              if (path) {
                edges.push({
                  group1,
                  group2,
                  path,
                  distance: this.calculatePathLength(path),
                });
              }
              resolve();
            });
            this.easyStar.calculate();
          }),
      ),
    );

    //We need to ensure that every path has resolved before we can start to draw them
    await Promise.all(pathPromises);

    //And now we have graph stuff, yay...
    //Sort the edges and run union find on it (This is very much not my original code. Graphs are hard)
    edges.sort((a, b) => a.distance - b.distance);
    const parent = new Map(groups.map((group) => [group, group]));
    const rank = new Map(groups.map((group) => [group, 0]));

    const find = (group: Group): Group => {
      if (parent.get(group) !== group) {
        parent.set(group, find(parent.get(group)!)); // Path compression
      }
      return parent.get(group)!;
    };

    const union = (group1: Group, group2: Group): void => {
      const [root1, root2] = [find(group1), find(group2)];
      if (root1 !== root2) {
        const [rank1, rank2] = [rank.get(root1)!, rank.get(root2)!];
        if (rank1 > rank2) parent.set(root2, root1);
        else if (rank1 < rank2) parent.set(root1, root2);
        else {
          parent.set(root2, root1);
          rank.set(root1, rank1 + 1);
        }
      }
    };

    //Now use Kruskal's algorithm to find the Minimum spanning tree for our road network
    const treeEdges = edges.filter((edge) => {
      const { group1, group2 } = edge;
      if (find(group1) !== find(group2)) {
        union(group1, group2);
        return true;
      }
      return false;
    });

    //Finally, draw the roads on the map

    treeEdges.forEach((edge) => {
      edge.path.forEach((tile) => {
        this.add.circle(
          tile.x * TILESIZE + 8,
          tile.y * TILESIZE + 8,
          4,
          0x00ff00,
        ); // Draw path
      });
    });
  }

  ////************Helper Functions************////

  //Changes the multiplier on the noise function to zoom in or out.
  //Forces a scene restart with each zoom level change.
  zoomMap(amount: number): void {
    this.currentZoomLevel += amount;
    console.log(`Changing zoom to ${this.currentZoomLevel}`);
    this.scene.restart();
  }

  doBorderTiles(yPos: number, xPos: number): void {
    // Get the current tile ID
    const tileID = phaserMap.getTileAt(xPos, yPos, true).index;

    // Determine if there's a smaller tile in each direction
    const hasTop =
      yPos > 0
        ? phaserMap.getTileAt(xPos, yPos - 1, true).index < tileID
        : true;
    const hasBottom =
      yPos < this.mapHeight - 1
        ? phaserMap.getTileAt(xPos, yPos + 1, true).index < tileID
        : true;
    const hasLeft =
      xPos > 0
        ? phaserMap.getTileAt(xPos - 1, yPos, true).index < tileID
        : true;
    const hasRight =
      xPos < this.mapWidth - 1
        ? phaserMap.getTileAt(xPos + 1, yPos, true).index < tileID
        : true;

    // Create a bitmask of the directions
    const bitmask =
      (hasTop ? 1 : 0) |
      (hasBottom ? 2 : 0) |
      (hasLeft ? 4 : 0) |
      (hasRight ? 8 : 0);

    // Lookup table for tile offsets and rotations
    const tileData: { [key: number]: { offset: number; rotation: number } } = {
      1: { offset: 1, rotation: 0 }, // Top
      2: { offset: 1, rotation: Math.PI }, // Bottom
      3: { offset: 5, rotation: Math.PI / 2 }, // Top and Bottom
      4: { offset: 1, rotation: -Math.PI / 2 }, // Left
      5: { offset: 2, rotation: -Math.PI / 2 }, // Top and Left
      6: { offset: 2, rotation: Math.PI }, // Bottom and Left
      7: { offset: 3, rotation: (3 * Math.PI) / 2 }, // Top, Bottom, and Left
      8: { offset: 1, rotation: Math.PI / 2 }, // Right
      9: { offset: 2, rotation: 0 }, // Top and Right
      10: { offset: 2, rotation: Math.PI / 2 }, // Bottom and Right
      11: { offset: 3, rotation: Math.PI / 2 }, // Top, Bottom, and Right
      12: { offset: 5, rotation: 0 }, // Left and Right
      13: { offset: 3, rotation: 0 }, // Top, Left, and Right
      14: { offset: 3, rotation: Math.PI }, // Bottom, Left, and Right
      15: { offset: 4, rotation: 0 }, // All sides
    };

    // Handle tile placement and rotation based on the bitmask
    if (tileData[bitmask]) {
      const { offset, rotation } = tileData[bitmask];
      phaserMap.putTileAt(tileID + offset, xPos, yPos);
      const tile = phaserMap.getTileAt(xPos, yPos);
      tile.rotation = rotation;
    }
  }

  //Bounces the map zoom level between 0 and 20. Calls the zoomMap function
  // and therefore forces a scene restart with each zoom level change.
  autoZoom(): void {
    if (this.currentZoomLevel >= 20) {
      this.isAutoZoomingIn = true;
    } else if (this.currentZoomLevel <= 0) {
      this.isAutoZoomingIn = false;
    }

    this.zoomMap(this.isAutoZoomingIn ? -0.01 : 0.01);
  }

  //Calculates the total length of a coordinate array representing a graph.
  // Uses manhattan coordinates because it is a grid
  calculatePathLength(path: { x: number; y: number }[]): number {
    let totalDistance = 0;

    for (let i = 0; i < path.length - 1; i++) {
      const step1 = path[i];
      const step2 = path[i + 1];
      const distance =
        Math.abs(step2.x - step1.x) + Math.abs(step2.y - step1.y);
      totalDistance += distance; // Sum of distances
    }

    return totalDistance;
  }
}
