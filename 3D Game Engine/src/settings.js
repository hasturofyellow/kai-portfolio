// Global settings store for the 3D engine
export class Settings {
    static data = {};

    static add(key, value) {
        Settings.data[key] = value;
    }

    static get(key) {
        return Settings.data[key];
    }

    // Delta time - set each frame
    static dt = 0;
}
