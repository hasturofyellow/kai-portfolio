# Kai's Movie Theater Portfolio - 3D Remake

## Vision
A fully immersive 3D experience where you start **outside** a movie theater at night, walk through the entrance, buy your ticket, and explore inside. Each movie poster is a portal to a different game project.

---

## The Journey

### Act 1: Outside the Theater (Night Street)
You spawn on a city sidewalk at night. In front of you: a glowing movie theater with:
- **Marquee sign** with animated lights spelling "KAI'S CINEMA"
- **Ticket booth** with a friendly robot attendant
- **Movie posters** in glass cases outside (preview of what's inside)
- **Neon lights** reflecting on wet pavement
- **Ambient city sounds** - distant traffic, muffled music

**Player goal:** Walk up to the ticket booth, get your ticket, enter through the front doors.

### Act 2: The Lobby
Push through the doors into a grand art-deco lobby:
- **Red velvet ropes** guiding the path
- **Concession stand** with popcorn machine (collect popcorn here)
- **Movie posters** lining the walls (smaller ones, teasers)
- **Chandelier** with warm lighting
- **Usher bot** who gives hints and flavor dialogue
- **Doors to Theater 1** - the main attraction

**Player goal:** Explore, collect popcorn, talk to usher, enter the theater.

### Act 3: The Theater Room
The main event - a classic movie theater:
- **Giant screen** showing animated "Now Playing" graphics
- **Rows of red velvet seats**
- **Projector beam** with floating dust particles
- **6 giant movie posters** on the walls - these are the PORTALS
- **Stage with curtains**

**Player goal:** Jump into posters to visit game projects.

### Act 4: VIP Lounge (Secret)
Unlock by collecting all popcorn:
- **Hidden door** behind the screen or in lobby
- **Sleek modern lounge** with neon lighting
- **Trophy display**
- **Secret project preview**

---

## Locations & Models

### 1. Exterior Street Scene
```
┌─────────────────────────────────────────────┐
│                 NIGHT SKY                    │
│              (stars, moon)                   │
├─────────────────────────────────────────────┤
│                                             │
│    ╔═══════════════════════════════╗        │
│    ║    KAI'S CINEMA    ║        │
│    ║   ★ NOW PLAYING ★   ║        │
│    ╠═══════════════════════════════╣        │
│    ║ ┌─────┐  ENTRANCE  ┌─────┐ ║        │
│    ║ │POSTER│  ══════  │POSTER│ ║        │
│    ║ └─────┘   DOORS   └─────┘ ║        │
│    ╚═══════════════════════════════╝        │
│         │TICKET│                            │
│         │ BOOTH│                            │
│    ─────────────────────────────────        │
│           SIDEWALK                          │
│    ═════════════════════════════════        │
│              STREET                         │
└─────────────────────────────────────────────┘
```

**Objects to build:**
- Theater building facade (box with decorated front)
- Marquee sign with bulb lights (animated)
- Ticket booth (small structure with window)
- Entrance doors (glass with handles)
- Sidewalk (concrete texture)
- Street (asphalt with lane markings)
- Street lamps
- Parked cars (simple shapes)
- Wet pavement effect (reflective material)

### 2. Lobby
```
┌─────────────────────────────────────────────┐
│                  CEILING                     │
│               (chandelier)                   │
├─────────────────────────────────────────────┤
│                                             │
│  ┌────┐                          ┌────┐    │
│  │POST│   VELVET ROPE PATH       │POST│    │
│  └────┘  ═══════════════════     └────┘    │
│         ║               ║                   │
│  ┌──────╨───┐     ┌─────╨────┐             │
│  │CONCESSION│     │  USHER   │             │
│  │  STAND   │     │   BOT    │             │
│  └──────────┘     └──────────┘             │
│                                             │
│         ╔═══════════════╗                   │
│         ║  THEATER 1    ║                   │
│         ║    DOORS      ║                   │
│         ╚═══════════════╝                   │
│                                             │
│  ══════════════════════════════════════     │
│              ENTRANCE FROM OUTSIDE           │
└─────────────────────────────────────────────┘
```

**Objects to build:**
- Floor (marble/carpet pattern)
- Walls (art deco panels, gold trim)
- Concession stand (glass case, popcorn machine)
- Velvet rope barriers
- Poster frames (smaller, decorative)
- Chandelier (glowing)
- Usher bot (friendly character)
- Double doors to theater

### 3. Theater Room
```
┌─────────────────────────────────────────────┐
│                  CEILING                     │
│               (projector)                    │
├─────────────────────────────────────────────┤
│                                             │
│  ╔═════════════════════════════════════╗   │
│  ║                                     ║   │
│  ║         GIANT SCREEN               ║   │
│  ║        (animated text)             ║   │
│  ║                                     ║   │
│  ╚═════════════════════════════════════╝   │
│  ║ CURTAIN ║                 ║ CURTAIN ║   │
│                                             │
│  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐│
│  │ P1 │ │ P2 │ │ P3 │ │ P4 │ │ P5 │ │ P6 ││
│  └────┘ └────┘ └────┘ └────┘ └────┘ └────┘│
│           (PORTAL POSTERS)                  │
│                                             │
│  ═══════════════════════════════════════   │
│  ═══════════════════════════════════════   │
│  ═══════════════════════════════════════   │
│              (SEAT ROWS)                    │
│                                             │
│         ══════════════════                  │
│              ENTRANCE                        │
└─────────────────────────────────────────────┘
```

---

## Technical Implementation

### File Structure
```
3D Game Engine/
├── index.html
├── src/
│   ├── main.js
│   ├── settings.js
│   ├── input.js
│   ├── game/
│   │   ├── theaterGame.js      # Main game logic
│   │   ├── player.js           # Player controller
│   │   ├── locations/
│   │   │   ├── exterior.js     # Street scene builder
│   │   │   ├── lobby.js        # Lobby builder
│   │   │   └── theater.js      # Theater room builder
│   │   ├── objects/
│   │   │   ├── marquee.js      # Animated sign
│   │   │   ├── ticketBooth.js  # Ticket booth + NPC
│   │   │   ├── concession.js   # Popcorn stand
│   │   │   ├── usher.js        # Usher bot
│   │   │   ├── poster.js       # Portal poster
│   │   │   ├── door.js         # Interactive doors
│   │   │   └── projector.js    # Projector + beam
│   │   ├── collectibles/
│   │   │   └── popcorn.js      # Collectible item
│   │   └── ui/
│   │       ├── hud.js          # Score, hints
│   │       └── dialogue.js     # NPC dialogue boxes
│   └── assets/
│       └── (textures, etc.)
```

### Phase 1: Core Systems (Use Existing Engine)
- [x] Renderer & scene setup
- [x] Input system
- [x] Basic player movement
- [ ] Collision detection (walls, objects)
- [ ] Door/trigger system
- [ ] Scene transitions

### Phase 2: Exterior Scene
- [ ] Night skybox
- [ ] Theater building facade
- [ ] Marquee sign with animated lights
- [ ] Ticket booth with NPC interaction
- [ ] Street lamps with glow
- [ ] Entrance doors (trigger to enter)

### Phase 3: Lobby
- [ ] Art deco room
- [ ] Concession stand
- [ ] Velvet rope path
- [ ] Usher bot with dialogue
- [ ] Popcorn collectibles
- [ ] Door to theater

### Phase 4: Theater Room
- [ ] Screen with animated texture
- [ ] Projector beam + dust particles
- [ ] Seat rows
- [ ] 6 portal posters
- [ ] Curtains
- [ ] Jump-into-poster mechanic

### Phase 5: Polish
- [ ] VIP lounge secret
- [ ] All sound effects
- [ ] Music/ambience
- [ ] UI overlays
- [ ] Easter eggs

---

## Game Projects (Posters)

From the original legoTest.html:
1. **Blast Block** - blastblock.html
2. **Age of War** - ageOfWar.html
3. **Cheeseburger Empire** - Idle.html
4. **Snake Game** - snakeGame.html
5. **Sharknado CYOA** - sharkNado.html
6. **Doodle Jump** - doodleJump.html

---

## Player Mechanics

### Movement
- WASD / Arrow keys to move
- Mouse to look around (click to capture)
- Space to jump (double jump enabled)
- Shift to run

### Interactions
- Walk up to NPCs to trigger dialogue
- Press E to interact (buy ticket, open doors)
- Jump into poster frames to teleport

### Collectibles
- Popcorn scattered around lobby and theater
- Collect all to unlock VIP lounge

---

## Visual Style

### Color Palette
- **Night exterior:** Deep blues, purples, neon pinks/yellows
- **Lobby:** Warm golds, rich reds, cream whites
- **Theater:** Dark with spotlight accents, red velvet
- **VIP:** Cool blues, neon cyan, sleek black

### Lighting
- **Exterior:** Street lamps, neon signs, marquee bulbs
- **Lobby:** Warm chandelier, accent lights
- **Theater:** Projector beam, subtle aisle lights
- **VIP:** Neon strips, disco ball reflections

### Materials
- Wet pavement (high metalness, low roughness)
- Velvet seats (high roughness, no metalness)
- Gold trim (medium metalness, low roughness)
- Glass (transparent, reflective)
- Neon (emissive materials)

---

## Build Order (Recommended)

### Week 1: Foundation
1. Set up scene transitions (exterior → lobby → theater)
2. Basic collision system
3. Door/trigger system
4. Player can walk through all three areas

### Week 2: Exterior
1. Build theater facade
2. Animated marquee sign
3. Ticket booth with simple NPC
4. Night lighting

### Week 3: Lobby & Theater
1. Lobby layout
2. Concession stand
3. Theater room with screen
4. Basic poster portals

### Week 4: Polish
1. Projector beam + dust
2. Usher bot dialogue
3. Popcorn collectibles
4. VIP lounge
5. All sound effects
6. UI/HUD

---

## Stretch Goals

- **Weather:** Light rain outside with puddle reflections
- **Animated characters:** NPCs with idle animations
- **Dynamic marquee:** Shows the poster title you're nearest to
- **Photo mode:** Pause and take screenshots
- **Achievements:** "First Visit", "Popcorn Master", "VIP Access"

---

## Getting Started

First step: Modify the existing 3D Game Engine to support:
1. Multiple "rooms" that can be loaded/unloaded
2. Trigger zones (walk into area → something happens)
3. Interactive objects (doors, NPCs)

Then build the exterior scene as a proof of concept.
