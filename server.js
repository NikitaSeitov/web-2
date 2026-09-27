const express = require('express');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const DATA_DIR = path.join(__dirname, 'data');
const RESP_FILE = path.join(DATA_DIR, 'responses.json');

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname)));

function ensureDataFile(){
  if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, {recursive:true});
  if(!fs.existsSync(RESP_FILE)) fs.writeFileSync(RESP_FILE, '[]', 'utf8');
}

function readResponses(){
  ensureDataFile();
  const raw = fs.readFileSync(RESP_FILE, 'utf8');
  try{ return JSON.parse(raw); }catch(e){ return []; }
}

function writeResponses(arr){
  ensureDataFile();
  fs.writeFileSync(RESP_FILE, JSON.stringify(arr, null, 2), 'utf8');
}

// use shared stats helper
const { calculateStatistics } = require('./stats');

app.post('/api/responses', (req, res) => {
  try{
    const payload = req.body;
    if(!payload || !payload.answers) return res.status(400).json({error:'invalid payload'});
    const responses = readResponses();
    responses.push(payload);
    writeResponses(responses);
    res.json({ok:true});
  }catch(e){
    console.error(e); res.status(500).json({error:'server error'});
  }
});

app.get('/api/statistics', (req, res) => {
  try{
    const responses = readResponses();
    const stats = calculateStatistics(responses);
    res.json(stats);
  }catch(e){
    console.error(e); res.status(500).json({error:'server error'});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('Server running on', PORT));
