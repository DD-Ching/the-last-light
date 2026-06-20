/*
 * HidingSpot.js — A closet or bed you can hide in by pressing E.
 *
 * Hiding makes the ghost unable to *see* you, but it is NOT a guarantee:
 *  - If the ghost watched you climb in, it will come straight for you.
 *  - While searching, the ghost may decide to check the spot anyway.
 *  - The more you hide, the more suspicious (likely to check) it becomes.
 *
 * This class is mostly visual + a position. The detection rules live in
 * GameScene where all the actors are known.
 */

class HidingSpot {
  constructor(scene, x, y, type) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.type = type; // 'closet' | 'bed'
    this.occupied = false;
    this.checkedThisVisit = false; // ghost only rolls a check once per visit

    const key = type === 'bed' ? 'bed' : 'closet';
    this.sprite = scene.add.image(x, y, key).setDepth(20);

    // A faint outline that brightens when the player is near (set by scene).
    this.glow = scene.add.image(x, y, key + 'Glow').setDepth(19).setAlpha(0);
  }

  setHighlight(on) {
    this.glow.setAlpha(on ? 0.5 : 0);
  }
}
