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

    // A soft glow drawn ABOVE the darkness so the spot is findable in the dark.
    // Cyan = "safe / interactable" — distinct from gold keys and the red exit.
    // It pulses gently, and turns bright white when the player is in range.
    this.marker = scene.add.image(x, y, 'glow').setDepth(1150)
      .setTint(0x6fd6ff).setDisplaySize(118, 122).setAlpha(0.6)
      .setBlendMode(Phaser.BlendModes.ADD);
    // A crisp outline on top gives the glow a readable "object" shape.
    this.ring = scene.add.image(x, y, key + 'Glow').setDepth(1151)
      .setTint(0xbfeeff).setAlpha(0.75);
    // Pulse alpha only (the marker's size is set via setDisplaySize, so we must
    // not tween its scale or it would reset to the texture's full size).
    scene.tweens.add({
      targets: [this.marker, this.ring], alpha: '+=0.2',
      duration: 950, yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
  }

  setHighlight(on) {
    const t = on ? 0xffffff : 0x73d7ff;
    this.marker.setTint(t);
    this.ring.setTint(on ? 0xffffff : 0x9fe4ff);
  }
}
