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

export function onPrograms(callback) {
  let unsub = onValue(programsRef, snap => {
    let programsById = snap.val() || {};
    let programs = [];
    for (let [id, program] of Object.entries(programsById)) {
      let { code, name } = program;
      programs.push({ id, code, name, });
    }
    callback(programs);
  });
  return () => {
    unsub();
  };
}

export async function saveProgram({ id, name, code }) {
  name = name || 'A new program';
  code = code || '';
  if (!id) {
    let programRef = await push(programsRef, { name, code });
    return { id: programRef.key, name, code };
  }
  await set(child(programsRef, id), { name, code });
  return { id, name, code };
}

export async function deleteProgram(id) {
  await set(child(programsRef, id), null);
}