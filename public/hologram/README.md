# Hologram assets

- `portrait.webp` / `depth.webp`: cut-out photo and depth map used by the depth-relief hologram (default).
- **Optional true 3D:** put a `bust.glb` in this folder and the site uses it automatically instead of the relief
  (same fresnel rim, scanlines, additive glow). Export from Tripo3D / Meshy / Rodin using a photo with the green
  binary rain removed (`portrait.webp` is already clean), then in Blender: decimate to 15k-30k triangles, set the
  origin at the base of the bust, apply scale/rotation, export glTF binary (.glb) with textures.
