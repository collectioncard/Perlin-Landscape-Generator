import { Scene } from 'phaser';

//Yes, this is bad. I dont care
// @ts-ignore
import { Noise } from 'noisejs';

export class scene1 extends Scene {
    noise: Noise;

    currentZoomLevel: number = 6; //10 by default for now
    shouldAutoZoom: boolean = false;


    constructor() {
        super('scene1');
        this.noise = new Noise(Math.random());
    }

    preload(): void {
        this.load.image('tiles', 'assets/basicTileset/basicSheet.png');
    }

    create(): void {
        const map = this.make.tilemap({data: this.generateRandomMap(), tileWidth: 64, tileHeight: 64});
        const tiles = map.addTilesetImage('tiles');
        map.createLayer(0, tiles!, 0, 0);

        // Handle user input via events
        this.input.keyboard!.on('keydown-Z', () => {
            this.shouldAutoZoom = !this.shouldAutoZoom;
        });

        this.input.keyboard!.on('keydown-U', () => {
            this.zoomMap(-.1);
        });

        this.input.keyboard!.on('keydown-I', () => {
            this.zoomMap(.1);
        });

    }

    update(): void {
        if (this.shouldAutoZoom){
            this.autoZoom();
        }
    }

    private zoomMap(amtToZoom: number): void {
        this.currentZoomLevel += amtToZoom;
        console.log(`Zoom level is now ${this.currentZoomLevel}`);
        this.scene.restart();
    }

    private autoZoom(): void {
        let temp: boolean = false;

        if (this.currentZoomLevel >= 20) {
            temp = true;
        } else if (this.currentZoomLevel <= 0) {
            temp = false;
        }

        this.zoomMap(temp ? -0.01 : 0.01)
    }

    generateRandomMap(): number[][]{
        //Size of the map in tiles
        const mapX: number = this.game.config.width as number / 64;
        const mapY: number = this.game.config.height as number / 64;

        //The range of the values after normalization
        let max: number = 10;
        let min: number = 0;

        const perlinNoiseArr: number[][] = new Array(mapX).fill(null).map(() => new Array(mapY));

        let highestValue: number = 0;

        //Generate the perlin noise
        for (let x: number = 0; x < mapX; x++) {
            for (let y: number = 0; y < mapY; y++) {
                perlinNoiseArr[x][y] = Math.abs(this.noise.perlin2((x*.01+.01) * this.currentZoomLevel, (y*.01+.01) * this.currentZoomLevel));
                if (perlinNoiseArr[x][y] > highestValue) {
                    highestValue = perlinNoiseArr[x][y];
                }
            }
        }

        //Normalize the values and assign a percentage to each tile
        for (let x: number = 0; x < mapX; x++) {
            for (let y: number = 0; y < mapY; y++) {
                let temp: number = perlinNoiseArr[x][y];
                temp = (max - min) * ((temp - min)/(highestValue - min)) + min;

                if (temp < 2) { //about 20% of the map should be water
                    temp = 0;
                } else if (temp < 4) { //20 percent sand
                    temp = 1;
                } else if (temp < 6) { //20 dirt
                    temp = 2;
                } else { //40 grass
                    temp = 3;
                }
                perlinNoiseArr[x][y] =temp;
            }
        }
        return perlinNoiseArr;
    }
}