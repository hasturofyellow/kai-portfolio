# Second Feature: Cinema Lobby Props

15 stylized props. Flat-shaded, one shared 1024x1024 atlas.
Per-prop triangle counts are in the table below.

## Scale
1 Blender unit = 1 metre. Built to real-world scale.

## Contents
| Prop | Tris | Pivot |
|---|---|---|
| concession_counter | 1672 | base_center |
| concession_register | 572 | base_center |
| popcorn_machine | 2316 | base_center |
| soda_tower | 1188 | base_center |
| snack_set | 1504 | base_center |
| projector | 1668 | base_center |
| ticket_booth | 1748 | base_center |
| now_sign | 924 | world_origin |
| letter_rows | 1100 | world_origin |
| poster_lightboxes | 968 | world_origin |
| seat_row | 1144 | base_center |
| single_seat | 528 | base_center |
| screen_stage | 880 | base_center |
| usher_stand | 572 | base_center |
| exit_sign | 660 | world_origin |

## Formats
- `pack.glb`: Godot, Three.js, web (Y-up, metres). Recommended.
- `pack.fbx`: Unity/Unreal. In Unity set "Convert Units" on import. In Unreal,
  **disable Generate Lightmap UVs** (this pack uses a single packed UV channel).


## Texturing
One 1024x1024 gradient-ramp atlas, one opaque material + one emissive material.
If props look untextured, ensure `atlas.png` is in the same folder and the material
samples it as Base Color.

## Licence
Base pack: CC0 1.0 (public domain). Use commercially, no attribution required.
