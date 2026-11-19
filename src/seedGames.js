'use strict';

// Trăsături: strategy (strategie), creativity (creativitate), speed (viteză), social (comunicare)
module.exports = [
  {
    name: 'Mimă', emoji: '🎭', duration: 30, fun: 8, min_players: 4, max_players: 16,
    description: 'Un jucător arată un cuvânt doar prin gesturi, echipa ghicește înainte să expire timpul.',
    roles: [
      { name: 'Mimă', count: 1, weights: { creativity: 3, social: 2, speed: 1, strategy: 0 } },
      { name: 'Ghicitor', count: 2, weights: { speed: 3, social: 2, creativity: 1, strategy: 0 } },
      { name: 'Cronometror', count: 1, weights: { strategy: 2, speed: 1, social: 0, creativity: 0 } },
    ],
  },
  {
    name: 'Pictionary', emoji: '🎨', duration: 35, fun: 8, min_players: 4, max_players: 16,
    description: 'Cuvântul se desenează pe o foaie, fără litere și fără vorbit.',
    roles: [
      { name: 'Desenator', count: 1, weights: { creativity: 4, speed: 2, social: 0, strategy: 0 } },
      { name: 'Ghicitor', count: 2, weights: { speed: 2, social: 2, creativity: 1, strategy: 1 } },
      { name: 'Cronometror', count: 1, weights: { strategy: 2, speed: 1, social: 0, creativity: 0 } },
    ],
  },
  {
    name: 'Taboo', emoji: '🚫', duration: 30, fun: 7, min_players: 4, max_players: 16,
    description: 'Explici un cuvânt fără să folosești cuvintele interzise de pe carte.',
    roles: [
      { name: 'Descriitor', count: 1, weights: { social: 3, creativity: 2, speed: 2, strategy: 0 } },
      { name: 'Paznic', count: 1, weights: { speed: 3, strategy: 2, social: 0, creativity: 0 } },
      { name: 'Ghicitor', count: 2, weights: { speed: 2, social: 2, strategy: 1, creativity: 0 } },
    ],
  },
  {
    name: 'Codenames', emoji: '🕵️', duration: 25, fun: 8, min_players: 4, max_players: 16,
    description: 'Maestrul de spionaj dă indicii de un cuvânt, agenții găsesc cărțile echipei.',
    roles: [
      { name: 'Maestru spion', count: 1, weights: { strategy: 4, creativity: 3, social: 1, speed: 0 } },
      { name: 'Agent', count: 3, weights: { strategy: 2, social: 2, speed: 1, creativity: 1 } },
    ],
  },
  {
    name: 'Quiz', emoji: '🧠', duration: 40, fun: 7, min_players: 4, max_players: 18,
    description: 'Întrebări de cultură generală, câte un punct pentru fiecare răspuns corect.',
    roles: [
      { name: 'Căpitan', count: 1, weights: { strategy: 3, social: 3, speed: 1, creativity: 0 } },
      { name: 'Specialist', count: 2, weights: { strategy: 3, speed: 2, creativity: 1, social: 0 } },
      { name: 'Scrib', count: 1, weights: { speed: 3, strategy: 1, social: 0, creativity: 0 } },
    ],
  },
  {
    name: 'Fotbal de masă', emoji: '⚽', duration: 20, fun: 8, min_players: 4, max_players: 8,
    description: 'Meci rapid în echipe de doi la masa de foosball.',
    roles: [
      { name: 'Atacant', count: 1, weights: { speed: 4, creativity: 2, strategy: 1, social: 0 } },
      { name: 'Apărător', count: 1, weights: { strategy: 3, speed: 2, social: 1, creativity: 0 } },
    ],
  },
  {
    name: 'Belot', emoji: '🃏', duration: 45, fun: 6, min_players: 4, max_players: 8,
    description: 'Cărți în echipe de câte doi, primii la suma de puncte convenită câștigă.',
    roles: [
      { name: 'Conducător', count: 1, weights: { strategy: 4, social: 2, speed: 0, creativity: 1 } },
      { name: 'Partener', count: 1, weights: { strategy: 3, social: 3, speed: 1, creativity: 0 } },
    ],
  },
  {
    name: 'Darts', emoji: '🎯', duration: 25, fun: 6, min_players: 2, max_players: 16,
    description: 'Runde de aruncat cu săgeți, scorul echipei se adună la finalul rundei.',
    roles: [
      { name: 'Aruncător', count: 2, weights: { speed: 2, strategy: 2, creativity: 0, social: 0 } },
      { name: 'Scorer', count: 1, weights: { strategy: 3, speed: 1, social: 1, creativity: 0 } },
    ],
  },
];
