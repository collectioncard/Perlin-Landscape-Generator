import {scene1} from './scenes/scene1';

import { Game, Types } from "phaser";

const TILESIZE: number = 64;


//  Find out more information about the Game Config at:
//  https://newdocs.phaser.io/docs/3.70.0/Phaser.Types.Core.GameConfig
const config: Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: TILESIZE * 40,
    height: TILESIZE * 40,
    parent: 'game-container',
    backgroundColor: '#127803',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [
        scene1
    ]
};

export default new Game(config);
