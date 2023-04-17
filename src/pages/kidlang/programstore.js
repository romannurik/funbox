import { initializeApp } from "firebase/app";
import { set, onValue, child, update, push, ref, getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAegAvdEsecziDgcJchmsQskmpbCnL4Inc",
  authDomain: "funbox-games.firebaseapp.com",
  databaseURL: "https://funbox-games-default-rtdb.firebaseio.com",
  projectId: "funbox-games",
  storageBucket: "funbox-games.appspot.com",
  messagingSenderId: "446384117534",
  appId: "1:446384117534:web:684f26a68f22db744d5b0f",
  measurementId: "G-N7ZM5G629M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const programsRef = ref(db, 'kidprograms');

const FIRESTORE = {
  onPrograms(callback) {
    let unsub = onValue(programsRef, snap => {
      let programsById = snap.val() || {};
      let programs = [];
      for (let [id, program] of Object.entries(programsById)) {
        let { code, name, ...meta } = program;
        programs.push({ id, code, name, ...meta });
      }
      callback(programs);
    });
    return () => {
      unsub();
    };
  },
  async saveProgram(program) {
    let { id, name, code, ...meta } = program;
    name = name || 'A new program';
    code = code || '';
    if (!id) {
      let programRef = await push(programsRef, { name, code, ...meta });
      return { id: programRef.key, name, code };
    }
    await set(child(programsRef, id), { name, code, ...meta });
    return { id, name, code, ...meta };
  },
  async deleteProgram(id) {
    await set(child(programsRef, id), null);
  },
}

const LOCAL = {
  onPrograms(callback) {
    this._cb = callback;
    this._cb && this._cb(JSON.parse(localStorage['programs'] || '[]'));
    return () => {
      this._cb = null;
    };
  },
  async saveProgram(program) {
    if (!program.id) {
      program.id = String(100000 + Math.floor(Math.random() * 899999));
    }

    let programs = JSON.parse(localStorage['programs'] || '[]');
    programs = programs.filter(p => p.id !== program.id);
    programs.push(program);
    localStorage['programs'] = JSON.stringify(programs);
    this._cb && this._cb(JSON.parse(localStorage['programs'] || '[]'));
    return program;
  },
  async deleteProgram(id) {
    let programs = JSON.parse(localStorage['programs'] || '[]');
    localStorage['programs'] = JSON.stringify(programs.filter(p => p.id !== id));
    this._cb && this._cb(JSON.parse(localStorage['programs'] || '[]'));
  },
}

let STORE = FIRESTORE;
if (window.location.search.indexOf('localprograms') >= 0) {
  STORE = LOCAL;
}

export function onPrograms(callback) {
  return STORE.onPrograms(callback);
}

export async function saveProgram(program) {
  return STORE.saveProgram(program);
}

export async function deleteProgram(id) {
  return STORE.deleteProgram(id);
}