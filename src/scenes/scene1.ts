import { Scene } from 'phaser';
// @ts-ignore
import { Noise } from 'noisejs';
// @ts-ignore
import tracery from 'tracery-grammar';

const TILESIZE = 64;

// Define the Group interface
interface Group {
    leader: [number, number];
    members: [number, number][];
    label?: Phaser.GameObjects.Text;
}

const grammar = tracery.createGrammar({
    "townName": [
        "#prefix##suffix#",
        "#prefix##name#",
        "#adjective# #place#",
        "#name##suffix#"
    ],
    "prefix": [
        "San", "Green", "Silver", "Red", "Iron", "Santa", "New", "Old", "East", "West", "North", "South", "Port", "Saint",
        "Fort", "Mount", "Spring", "Summer", "Winter", "Autumn", "Golden", "Crystal", "Emerald", "Ruby", "Sapphire",
        "Diamond", "Pearl", "Lavender"
    ],
    "suffix": [
        "town", "vale", "burg", "ridge", "haven", "ford", "ham", "ton", "field", "wood", "bridge", "port", "mouth"
    ],
    "adjective": [
        "Lonely", "Silent", "Forgotten", "Shimmering", "Windy", "Breezy", "Sunny", "Rainy", "Misty", "Foggy", "Snowy",
        "Icy", "Hot", "Cold", "Warm", "Gloomy", "Dark", "Bright", "Glowing", "Shining", "Dusty", "Sandy", "Rocky",
        "Muddy", "Leafy", "Flowery", "Grassy", "Mossy", "Soggy", "Dry", "Wet", "Damp", "Chilly", "Cool", "Stormy",
        "Calm", "Peaceful", "Quiet", "Busy", "Active", "Sleepy"
    ],
    "place": [
        "Atoll", "Peak", "Valley", "Shore", "Island"
    ],
    "name": [
        "Haven", "Wood", "Bridge", "Field", "Grove", "Cruz", "Barbara", "Diego"
    ]
});


export class scene1 extends Scene {
    noise: Noise = new Noise(Math.random());

    currentZoomLevel: number = 6;
    shouldAutoZoom: boolean = false;
    autoZoomingIn: boolean = true;

    constructor() {
        super('scene1');
    }

    preload(): void {
        this.load.image('tiles', 'assets/basicTileset/basicSheet.png');
    }

    create(): void {
        this.generateCompleteMap();

        this.input.keyboard!.on('keydown-Z', () => this.shouldAutoZoom = !this.shouldAutoZoom);

        this.input.keyboard!.on('keydown-PERIOD', () => this.zoomMap(0.1));

        this.input.keyboard!.on('keydown-COMMA', () => this.zoomMap(-0.1));

        this.input.keyboard!.on('keydown-R', () => {
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


    // Main map generation function.
    private generateCompleteMap(): number[][] {
        //Initial map from noise
        const currentMap = this.generateEmptyMap();

        const map = this.make.tilemap({ data: currentMap, tileWidth: TILESIZE, tileHeight: TILESIZE });
        const tiles = map.addTilesetImage('tiles');
        map.createLayer(0, tiles!, 0, 0);

        // Find groups of tiles
        const groups: Group[] = this.findGroups(currentMap, 3);

        // Draw labels over the leader of each groups
        this.labelGroups(groups);

        return currentMap;
    }

    // Generates a 2D array based on perlin noise
    generateEmptyMap(): number[][] {
        const mapX: number = this.game.config.width as number / TILESIZE;
        const mapY: number = this.game.config.height as number / TILESIZE;

        let max: number = 10;
        let min: number = 0;

        const perlinNoiseArr: number[][] = new Array(mapX).fill(null).map(() => new Array(mapY));
        let highestValue: number = 0;

        for (let x = 0; x < mapX; x++) {
            for (let y = 0; y < mapY; y++) {
                perlinNoiseArr[x][y] = Math.abs(this.noise.perlin2((x * 0.01 + 0.01) * this.currentZoomLevel, (y * 0.01 + 0.01) * this.currentZoomLevel));
                if (perlinNoiseArr[x][y] > highestValue) {
                    highestValue = perlinNoiseArr[x][y];
                }
            }
        }

        for (let x = 0; x < mapX; x++) {
            for (let y = 0; y < mapY; y++) {
                //min is always zero so this could be simplified, but maybe I'll wanna increase the floor later, idk
                let normalizedValue: number = (max - min) * ((perlinNoiseArr[x][y] - min) / (highestValue - min)) + min;

                if (normalizedValue < 2) {
                    normalizedValue = 0;
                } else if (normalizedValue < 4) {
                    normalizedValue = 1;
                } else if (normalizedValue < 6) {
                    normalizedValue = 2;
                } else {
                    normalizedValue = 3;
                }
                perlinNoiseArr[x][y] = normalizedValue;
            }
        }

        return perlinNoiseArr;
    }

    // Changes the zoom level and regenerates the map by restarting the scene
    private zoomMap(amtToZoom: number): void {
        this.currentZoomLevel += amtToZoom;
        console.log(`Zoom level is now ${this.currentZoomLevel}`);
        this.scene.restart();
    }

    // automatically zooms between 0 and 20
    private autoZoom(): void {

        if (this.currentZoomLevel >= 20) {
            this.autoZoomingIn = true;
        } else if (this.currentZoomLevel <= 0) {
            this.autoZoomingIn = false;
        }

        this.zoomMap(this.autoZoomingIn ? -0.01 : 0.01);
    }

    // Returns an array of groups of tiles with the same ID as the one given
    private findGroups(map: number[][], tileID: number): Group[] {
        const rows = Number(this.game.config.width) / TILESIZE;
        const cols: number = Number(this.game.config.height) / TILESIZE;

        const directions = [
            [-1, 0], [1, 0], [0, -1], [0, 1]
        ];

        const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
        const groups: Group[] = [];

        function dfs(x: number, y: number, group: Group) {
            if (x < 0 || y < 0 || x >= rows || y >= cols || visited[x][y] || map[x][y] !== tileID) {
                return;
            }

            visited[x][y] = true;
            group.members.push([x, y]);

            directions.forEach(([dx, dy]) => dfs(x + dx, y + dy, group));
        }

        function calculateGroupCenter(members: [number, number][]): { x: number, y: number } {
            let sumX = 0;
            let sumY = 0;

            for (const [x, y] of members) {
                sumX += x;
                sumY += y;
            }

            const centerX = sumX / members.length;
            const centerY = sumY / members.length;

            return { x: centerX, y: centerY };
        }

        function findClosestTile(center: { x: number, y: number }, members: [number, number][]): [number, number] {
            let closestTile = members[0];
            let closestDistance = Infinity;

            for (const [x, y] of members) {
                const distance = Math.hypot(center.x - x, center.y - y);
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestTile = [x, y];
                }
            }

            return closestTile;
        }

        for (let x = 0; x < rows; x++) {
            for (let y = 0; y < cols; y++) {
                if (map[x][y] === tileID && !visited[x][y]) {
                    const newGroup: Group = { leader: [0, 0], members: [] };
                    dfs(x, y, newGroup);

                    const center = calculateGroupCenter(newGroup.members);
                    newGroup.leader = findClosestTile(center, newGroup.members);

                    groups.push(newGroup);
                }
            }
        }

        return groups;
    }

    private labelGroups(groups: Group[]): void {
        groups.forEach(group => {
            const [leaderX, leaderY] = group.leader;

            group.label = this.add.text(
                leaderY * TILESIZE + TILESIZE / 2,
                leaderX * TILESIZE + TILESIZE / 2,
                grammar.flatten('#townName#'),
                {
                    fontSize: '24px',
                    // @ts-ignore
                    fill: '#ffffff',
                    align: 'center',
                }
            );

            group.label.setOrigin(0.5, 0.5);
        });
    }
}
