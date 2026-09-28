// The cinema's program is shared by the room screens and the visitor interface.
export const CINEMA_PROGRAM = [
    {
        room: 'theater1', number: '01', title: 'Age of War', category: 'STRATEGY',
        url: '../ageOfWar.html', image: '../ageOfWar.png', color: 0xff6644,
        description: 'Build an army. Defend your base. Advance through the ages.',
        detail: 'A browser strategy game about timing, upgrades and choosing your next unit.'
    },
    {
        room: 'theater2', number: '02', title: 'Blast Block', category: 'PUZZLE',
        url: '../blastblock.html', image: '../blastblock.png', color: 0x44aaff,
        description: 'Find the fit. Clear the board. Keep the streak alive.',
        detail: 'A colorful block-placement puzzle. Desktop drag-and-drop controls.'
    },
    {
        room: 'theater3', number: '03', title: 'Stick Soccer', category: 'SPORTS',
        url: '../stick/index.html', image: '../stickgame.png', color: 0x44ff88,
        description: 'A small pitch, a lively opponent and a race to three goals.',
        detail: 'A physics-based soccer game with keyboard movement, jumps and kicks.'
    },
    {
        room: 'theater4', number: '04', title: 'Snake Game', category: 'PROTOTYPE',
        url: '../snakeGame.html', image: '../snakeGame.png', color: 0x55fc77,
        description: 'An arena experiment with rivals, growth and momentum.',
        detail: 'Work in progress: local gameplay is incomplete; online mode needs a separate server.'
    }
];

export function getProgramEntry(room) {
    return CINEMA_PROGRAM.find(project => project.room === room);
}
