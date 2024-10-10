import { Scene } from 'phaser';

//Yes, this is bad. I dont care
// @ts-ignore
import { Noise } from 'noisejs';

export class scene1 extends Scene {
    noise: Noise;
    zoom: number = 0;
    zoomingOut: boolean = false;

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
        if(tiles){
            map.createLayer(0, tiles, 0, 0);
        }else{
            console.log("Error loading tileset");
        }
    }

    update(): void {
        this.autoZoom();

        console.log(`Scene is at zoom: ${this.zoom}`);

        this.scene.restart();
    }
    
    private autoZoom(): void {
        if (this.zoom >= 20) {
            this.zoomingOut = true;
        } else if (this.zoom <= 0) {
            this.zoomingOut = false;
        }

        this.zoom += this.zoomingOut ? -0.01 : 0.01;
    }

    generateRandomMap(): number[][]{
        //Size of the map in tiles
        const mapX: number = 30;
        const mapY: number = 40;

        //The range of the values after normalization
        let max: number = 4;
        let min: number = 0;

        const perlinNoiseArr: number[][] = new Array(mapX).fill(null).map(() => new Array(mapY));

        let highestValue: number = 0;

        //Generate the perlin noise
        for (let x: number = 0; x < mapX; x++) {
            for (let y: number = 0; y < mapY; y++) {
                perlinNoiseArr[x][y] = Math.abs(this.noise.perlin2((x*.01) * this.zoom, (y*.01) * this.zoom));
                if (perlinNoiseArr[x][y] > highestValue) {
                    highestValue = perlinNoiseArr[x][y];
                }
            }
        }

        //Normalize the values
        for (let x: number = 0; x < mapX; x++) {
            for (let y: number = 0; y < mapY; y++) {
                let temp: number = perlinNoiseArr[x][y];
                temp = (max - min) * ((temp - min)/(highestValue - min)) + min;
                perlinNoiseArr[x][y] = Math.floor(temp);
            }
        }
        console.log(perlinNoiseArr);
        return perlinNoiseArr;
    }
}