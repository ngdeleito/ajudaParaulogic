/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

window.addEventListener("load", onLoadHandler);
window.addEventListener("unload", onUnloadHandler);

function onLoadHandler() {
  if (document.location.hash === "") {
    document.location.hash = "#home";
  }
  
  document.getElementById("fusionarResultats")
          .addEventListener("click", mergeResults);
  document.getElementById("trobarPistes")
          .addEventListener("click", findHints);
}

function onUnloadHandler() {
  window.removeEventHandler("load", onLoadHandler);
  window.removeEventHandler("unload", onUnloadHandler);
  
  document.getElementById("fusionarResultats")
          .removeEventListener("click", mergeResults);
  document.getElementById("trobarPistes")
          .removeEventListener("click", findHints);
}

function transformStringSequenceToListOfWords(aString) {
  // remove potential trailing spaces, remove potential final dot and split
  return aString.trim().replace(/\.$/, "").split(", ");
}

function transformStringSequenceToSetOfWords(aString) {
  return new Set(transformStringSequenceToListOfWords(aString));
}

function mergeResults() {
  let words1 = transformStringSequenceToSetOfWords(
                 document.getElementById("jugador1_paraules").value);
  let words2 = transformStringSequenceToSetOfWords(
                 document.getElementById("jugador2_paraules").value);
  
  let player1Name = document.getElementById("jugador1_nom").value;
  let player2Name = document.getElementById("jugador2_nom").value;
  let missingWordsFor2 = words1.difference(words2);
  let missingWordsFor1 = words2.difference(words1);
  
  document.getElementById("resultats").value =
    `${player1Name}: ${Array.from(missingWordsFor1).join(", ")}\n\n` +
    `${player2Name}: ${Array.from(missingWordsFor2).join(", ")}`;
}

function removeDiacriticsAndDashes(word) {
  return word.replace(/à/g, "a")
             .replace(/[éè]/g, "e")
             .replace(/[íï]/g, "i")
             .replace(/[óò]/g, "o")
             .replace(/[úü]/g, "u")
             .replace(/\-se/g, "")
             .replace(/\-/g, "")
             .replace(/·/g, "");
}

function extractMainWord(word) {
  // 2 potential cases:
  // (1) different words spelled with the same base letters: "mes o més" --> mes
  // (2) expressions (assumption: non-main words are all 1 or 2 letters long):
  // "a la babalà" --> babalà
  return /([a-zç]){3,}/.exec(word)[0];
}

class MapCounter {
  constructor() {
    this.map = new Map();
  }
  
  add(key) {
    if (this.map.has(key)) {
      this.map.set(key, this.map.get(key) + 1);
    }
    else {
      this.map.set(key, 1);
    }
  }
  
  toString() {
    return [...this.map.entries()]
             .map(([key, value]) => `${key}: ${value}`)
             .sort()
             .join(", ");
  }
  
  top20Percent() {
    return [...this.map.entries()]
             .sort((entry1, entry2) => entry2[1] - entry1[1])
             .slice(0, this.map.size * 0.2)
             .map(([key, value]) => `${key}: ${value}`)
             .join(", ");
  }
}

function isPalindrome(word) {
  let i = 0;
  let result = true;
  while (i < word.length / 2 && result) {
    result = word[i] === word[word.length - 1 - i];
    ++i;
  }
  return result;
}

function isSquare(word) {
  if (word.length % 2 == 1) {
    return false;
  }
  
  let i = 0;
  let result = true;
  while (i < word.length / 2 && result) {
    result = word[i] === word[word.length / 2 + i];
    ++i;
  }
  return result;
}

let foundWords, prefixes2, prefixes3, suffixes3, palindromes, squareWords,
    subsets;

function init() {
  foundWords = new Map();
  prefixes2 = new MapCounter();
  prefixes3 = new MapCounter();
  suffixes3 = new MapCounter();
  palindromes = [];
  squareWords = [];
  subsets = new MapCounter();
}

function processWord(word) {
  let baseWord = extractMainWord(removeDiacriticsAndDashes(word));
  // we only keep counters for 3 or more letter words
  let lengthAsIndex = baseWord.length - 3;
  
  if (foundWords.has(baseWord[0])) {
    let counts = foundWords.get(baseWord[0]);
    counts[lengthAsIndex] = counts[lengthAsIndex] === undefined ?
                              1 : counts[lengthAsIndex] + 1;
    foundWords.set(baseWord[0], counts);
  }
  else {
    let counts = new Array();
    counts[lengthAsIndex] = 1;
    foundWords.set(baseWord[0], counts);
  }
  
  prefixes2.add(baseWord.substring(0, 2));
  prefixes3.add(baseWord.substring(0, 3));
  suffixes3.add(baseWord.substring(baseWord.length - 3));
  if (isPalindrome(baseWord)) {
    palindromes.push(baseWord);
  }
  if (isSquare(baseWord)) {
    squareWords.push(baseWord);
  }
  subsets.add(Array.from(new Set([...baseWord])).sort().join(""));
}

function foundWordsToString() {
  let maxLength = 0;
  let foundWordsAsMatrix = [...foundWords.entries()].map(([key, values]) => {
    maxLength = values.length + 1 > maxLength ? values.length + 1 : maxLength;
    return [key, ...values];
  });
  
  let matrixAsStringArray = foundWordsAsMatrix.map(values => {
    let index = 0;
    while (index < maxLength) {
      values[index] = values[index] === undefined ? 0 : values[index];
      ++index;
    }
    return values.join("\t");
  });
  matrixAsStringArray.unshift(["", ...Array.from({length: maxLength - 1},
    (value, index) => index + 3)].join("\t"));
  
  return matrixAsStringArray.join("\n");
}

function findHints() {
  init();
  
  let words = transformStringSequenceToListOfWords(document.getElementById("paraules").value);
  words.forEach(word => processWord(word));
  
  let palindromesText = palindromes.length === 1 ? "palíndrom" : "palíndroms";
  let squareWordsText = squareWords.length === 1 ? "mot quadrat" : "mots quadrats";
  let hints = [
    `Has trobat ${words.length} paraules`,
    `${foundWordsToString()}`,
    `Prefixos de dues lletres trobats: ${prefixes2.toString()}`,
    `Prefixos més freqüents de tres lletres trobats: ${prefixes3.top20Percent()}`,
    `Sufixos més freqüents de tres lletres trobats: ${suffixes3.top20Percent()}`,
    `Tens ${palindromes.length} ${palindromesText}: ${palindromes.join(", ")}`,
    `Tens ${squareWords.length} ${squareWordsText}: ${squareWords.join(", ")}`,
    `Subconjunts trobats: ${subsets.toString()}`
  ];
  document.getElementById("pistes").value = hints.join("\n\n");
}

/// TESTS

function testIsPalindrome() {
  console.log("palindrome");
  console.log("pipiripip" + " " + isPalindrome("pipiripip"));
  console.log("carrac" + " " + isPalindrome("carrac"));
  console.log("rere" + " " + isPalindrome("rere"));
  console.log("avui" + " " + isPalindrome("avui"));
  console.log("avi" + " " + isPalindrome("avi"));
}

function testIsSquare() {
  console.log("square");
  console.log("rere" + " " + isSquare("rere"));
  console.log("avi" + " " + isSquare("avi"));
}

function testRemoveDiacriticsAndDashes() {
  console.log("remove diacritics and dashes");
  console.log("meta o metà" + " " + removeDiacriticsAndDashes("meta o metà"));
  console.log("enllaç" + " " + removeDiacriticsAndDashes("enllaç"));
  console.log("de reüll" + " " + removeDiacriticsAndDashes("de reüll"));
  console.log("en pac de" + " " + removeDiacriticsAndDashes("en pac de"));
  console.log("tam-tam" + " " + removeDiacriticsAndDashes("tam-tam"));
  console.log("vis-a-vis" + " " + removeDiacriticsAndDashes("vis-a-vis"));
  console.log("arruar-se" + " " + removeDiacriticsAndDashes("arruar-se"));
  console.log("il·lús" + " " + removeDiacriticsAndDashes("il·lús"));
}

function testExtractMainWord() {
  console.log("extract main word");
  console.log("meta o metà" + " " + extractMainWord(removeDiacriticsAndDashes("meta o metà")));
  console.log("enllaç" + " " + extractMainWord(removeDiacriticsAndDashes("enllaç")));
  console.log("de reüll" + " " + extractMainWord(removeDiacriticsAndDashes("de reüll")));
  console.log("en pac de" + " " + extractMainWord(removeDiacriticsAndDashes("en pac de")));
  console.log("tam-tam" + " " + extractMainWord(removeDiacriticsAndDashes("tam-tam")));
  console.log("vis-a-vis" + " " + extractMainWord(removeDiacriticsAndDashes("vis-a-vis")));
  console.log("arruar-se" + " " + extractMainWord(removeDiacriticsAndDashes("arruar-se")));
}

function runTests() {
  testIsPalindrome();
  testIsSquare();
  testRemoveDiacriticsAndDashes();
  testExtractMainWord();
}

// runTests();
