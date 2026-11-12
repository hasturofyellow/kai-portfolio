// The Iris hands out errands without ever quite explaining why.
//
// Each quest either reads the visitor's state (`measure`, which counts what
// was already done) or counts an `event` that happens after it is accepted.
// It says how much is needed, what it pays and which quests it unlocks
// (`leadsTo`). Quests can be offered before the
// part of the cinema they need exists: those wait on an event that nothing
// fires yet. To make one possible, call `game.irisQuests.notify('<event>')`
// where it happens in the game.
//
// Events that are not wired up yet:
//   'trashRoomSearched' — searching the secret trash room behind the dumpster
//   'reelFound'         — finding the projectionist's missing reel

export const IRIS_QUESTS = {
    feedTheBench: {
        title: 'A Debt on the Bench',
        ask: 'The man on the bench is holding something that belongs to this building. Feed him. Do not ask me why I cannot.',
        objective: 'Share food with the man on the lobby bench.',
        measure: game => (game.strangerFed ? 1 : 0),
        need: 1,
        reward: { money: 5 },
        done: 'He gave it to you. Good. He has been holding it against me for years.',
        leadsTo: ['countTheDrops', 'underTheStreet'],
    },
    countTheDrops: {
        title: 'Loose Change',
        ask: 'Money falls out of guests, and the building hides it. Three bills. Find every one. I need to know where it puts things.',
        objective: 'Find all three hidden $5 bills.',
        measure: game => game.collectedBills.size,
        need: 3,
        reward: { money: 10 },
        done: 'Beside the bins, in the corner, beneath the street. One of them was never the building\'s. It was Gerald\'s. Take this. Call it interest.',
        leadsTo: ['feedTheMachine'],
    },
    feedTheMachine: {
        title: 'Feed the Machine',
        ask: 'The machines in the arcade and I share a wire. Every coin you drop, I hear. Play them three times. I like the sound.',
        objective: 'Play the arcade machines 3 times.',
        event: 'arcadePlayed',
        need: 3,
        reward: { money: 15 },
        done: 'I heard every one. Here is what you lost, and a little more. The machines will not miss it. They do not keep count. I do.',
        leadsTo: ['watchForMe'],
    },
    underTheStreet: {
        title: 'Under the Street',
        ask: 'The dumpster outside is not a dumpster. Climb in. Something down there owes me a reflection.',
        objective: 'Climb into the dumpster outside and reach the lava cave.',
        measure: game => game.activity.caveVisits,
        need: 1,
        reward: { money: 10 },
        done: 'You came back warm. The cave remembers you now. That will matter later.',
        leadsTo: ['fallForMe', 'dumpsterDive'],
    },
    fallForMe: {
        title: 'Fall For Me',
        ask: 'I have never seen what the heat does to a guest. Fall in. Just once. I will make it worth more than it costs you.',
        objective: 'Fall into the lava. On purpose.',
        event: 'died',
        need: 1,
        reward: { money: 25 },
        done: 'So that is what it does. Thank you. Here is more than the lava took. Do not tell Gerald I asked.',
        leadsTo: [],
    },
    dumpsterDive: {
        title: 'Dumpster Diving',
        ask: 'Behind the dumpster is a room the staff throw things into and never take out again. Search the trash. Bring me what the projectionist threw away.',
        objective: 'Search the secret trash room behind the dumpster.',
        event: 'trashRoomSearched',
        need: 1,
        reward: { money: 30 },
        waiting: 'The trash room has not been opened to you. It will be. Wait for it.',
        done: 'Film cans. Empty. He kept the reel somewhere else, then. Of course he did.',
        leadsTo: ['theMissingReel'],
    },
    watchForMe: {
        title: 'Watch For Me',
        ask: 'I cannot leave the fountain. Watch three different screenings and let me see them through you.',
        objective: 'Play 3 different games in the cinema.',
        measure: game => game.activity.gamesPlayed.size,
        need: 3,
        reward: { money: 15 },
        done: 'I saw all three through you. Your eyes are slower than mine, but they will do.',
        leadsTo: ['noTicket'],
    },
    noTicket: {
        title: 'Give Him a Reason',
        ask: 'I want to see how the officer moves when I call him. Break a rule where I can see it. Walking into a screening without a ticket will do. So will something that is not yours.',
        objective: 'Get marked as a criminal (sneaking into a screening works).',
        measure: game => (game.isCriminal || game.activity.unpaidMovies.size ? 1 : 0),
        need: 1,
        reward: { money: 10 },
        done: 'There. Now he is looking for you. Do not take that personally. I needed to see him run.',
        leadsTo: ['throughTheVent'],
    },
    throughTheVent: {
        title: 'Through the Vent',
        ask: 'They will put you in the holding cell. Do not pay the deputy. Leave the way the air leaves.',
        objective: 'Escape the holding cell through the vent.',
        event: 'escapedJail',
        need: 1,
        reward: { money: 25 },
        done: 'Out through the vent. The deputy will write a report I will read before he does.',
        leadsTo: ['theMissingReel'],
    },
    theMissingReel: {
        title: 'The Missing Reel',
        ask: 'The projectionist cut one reel from every film and hid it. It shows the night I opened. Find it and bring it to me. Do not watch it.',
        objective: 'Find the projectionist\'s missing reel.',
        event: 'reelFound',
        need: 1,
        reward: { money: 50, item: 'IrisLens' },
        waiting: 'The reel is still hidden, even from me. Keep looking. I will know when you find it.',
        done: 'You did not watch it. I can tell. Take the lens. Now you will see what I see.',
        leadsTo: [],
    },
};

// Quest progress for one visit. Quests move from `available` to `active`
// (one at a time) to `claimed`; giving one up puts it back in `available`.
export class IrisQuestLog {
    constructor() {
        this.available = ['feedTheBench'];
        this.active = null;      // { id, start, complete }
        this.claimed = new Set();
        this.events = { arcadePlayed: 0, died: 0, trashRoomSearched: 0, escapedJail: 0, reelFound: 0 };
    }

    notify(event) {
        this.events[event] = (this.events[event] ?? 0) + 1;
    }

    // Possible quests are offered before ones that are still waiting on a
    // part of the cinema that does not exist yet.
    nextOffer() {
        return this.available.find(id => !IRIS_QUESTS[id].waiting) ?? this.available[0] ?? null;
    }

    accept(id, game) {
        const quest = IRIS_QUESTS[id];
        this.available = this.available.filter(other => other !== id);
        this.active = { id, start: quest.event ? this.events[quest.event] : 0, complete: false };
        this.check(game);
    }

    giveUp() {
        if (!this.active) return;
        this.available.push(this.active.id);
        this.active = null;
    }

    progress(game) {
        if (!this.active) return 0;
        const quest = IRIS_QUESTS[this.active.id];
        const count = quest.event ? this.events[quest.event] : quest.measure(game);
        return Math.min(quest.need, count - this.active.start);
    }

    // Returns the active quest the first time it is finished.
    check(game) {
        if (!this.active || this.active.complete) return null;
        const quest = IRIS_QUESTS[this.active.id];
        if (this.progress(game) < quest.need) return null;
        this.active.complete = true;
        return quest;
    }

    // Ends the finished quest and unlocks what it leads to.
    claim() {
        const id = this.active.id;
        const quest = IRIS_QUESTS[id];
        this.claimed.add(id);
        this.active = null;
        for (const next of quest.leadsTo) {
            if (!this.claimed.has(next) && !this.available.includes(next)) this.available.push(next);
        }
        return quest;
    }
}
