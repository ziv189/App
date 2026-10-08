/* CHAPTERS — registre des chapitres. Contrat : game/DESIGN.md, section 8. */
(function () {
  const CHAPTERS = {
    list: {},
    order: ['ch1', 'ch2', 'ch3', 'ch4', 'ch5'],

    register(ch) {
      if (!ch || !ch.id) throw new Error('Chapitre sans id');
      this.list[ch.id] = ch;
      return ch;
    },

    get(id) {
      return this.list[id] || null;
    },
  };

  window.CHAPTERS = CHAPTERS;
})();
