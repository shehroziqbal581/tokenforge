import { Connection, PublicKey, SystemProgram, Transaction, Keypair } from '@solana/web3.js';
import { createMintToInstruction, createInitializeMintInstruction, createSetAuthorityInstruction, AuthorityType, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, MINT_SIZE } from '@solana/spl-token';

const RPC_URL = 'https://api.mainnet-beta.solana.com';
const FEE_WALLET = new PublicKey('DvcsKaBdcceoHewn8QgJAXYsWdAWckQw33vC3ASsBYpy');
const LAUNCH_FEE_SOL = 0.02;
const connection = new Connection(RPC_URL, 'confirmed');
let provider = null;

const $ = id => document.getElementById(id);
const fmt = n => Number(n||0).toLocaleString();

function getProvider(){
  if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
  if (window.solana?.isPhantom) return window.solana;
  return null;
}
async function connect(){
  provider = getProvider();
  if(!provider){ alert('Phantom not detected. Open this website inside Phantom or use a browser with the Phantom extension.'); return; }
  const r = await provider.connect();
  $('walletState').textContent = `${r.publicKey.toString().slice(0,4)}…${r.publicKey.toString().slice(-4)}`;
  $('connect').textContent = 'Wallet connected';
}
$('connect').onclick = connect;

['name','symbol','supply','decimals'].forEach(id=>$(id).addEventListener('input',()=>{
  $('previewName').textContent = $('name').value || 'Your token';
  $('previewSymbol').textContent = ($('symbol').value || 'SYMBOL').toUpperCase();
  $('previewSupply').textContent = fmt($('supply').value);
  $('previewDecimals').textContent = $('decimals').value || '9';
}));

async function createToken(){
  try{
    if(!provider) await connect();
    if(!provider) return;
    const owner = provider.publicKey;
    const name = $('name').value.trim(); const symbol = $('symbol').value.trim();
    const supply = BigInt($('supply').value); const decimals = Number($('decimals').value);
    if(!name || !symbol || supply <= 0n || decimals < 0 || decimals > 9) throw new Error('Please enter valid token details.');
    if(supply * (10n ** BigInt(decimals)) > 18446744073709551615n) throw new Error('Supply is too large for this token configuration.');
    $('create').disabled = true; $('create').textContent = 'Preparing transaction…';

    const mint = Keypair.generate();
    const ata = await getAssociatedTokenAddress(mint.publicKey, owner, false, TOKEN_PROGRAM_ID);
    const rent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
    const lamports = Math.round(LAUNCH_FEE_SOL * 1_000_000_000);
    const tx = new Transaction();
    tx.add(SystemProgram.createAccount({fromPubkey:owner,newAccountPubkey:mint.publicKey,space:MINT_SIZE,lamports,programId:TOKEN_PROGRAM_ID}));
    tx.add(createInitializeMintInstruction(mint.publicKey, decimals, owner, owner, TOKEN_PROGRAM_ID));
    tx.add(createAssociatedTokenAccountInstruction(owner, ata, owner, mint.publicKey, TOKEN_PROGRAM_ID));
    tx.add(createMintToInstruction(mint.publicKey, ata, owner, Number(supply * (10n ** BigInt(decimals))), [], TOKEN_PROGRAM_ID));
    tx.add(createSetAuthorityInstruction(mint.publicKey, owner, AuthorityType.MintTokens, null, [], TOKEN_PROGRAM_ID));
    tx.add(createSetAuthorityInstruction(mint.publicKey, owner, AuthorityType.FreezeAccount, null, [], TOKEN_PROGRAM_ID));
    tx.add(SystemProgram.transfer({fromPubkey:owner,toPubkey:FEE_WALLET,lamports}));
    tx.feePayer = owner; tx.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
    tx.partialSign(mint);
    const signed = await provider.signTransaction(tx);
    const sig = await connection.sendRawTransaction(signed.serialize(), {skipPreflight:false});
    await connection.confirmTransaction(sig, 'confirmed');
    $('result').classList.remove('hidden'); $('result').innerHTML = `<b>Token created.</b><br>Mint: <code>${mint.publicKey.toBase58()}</code><br><a target="_blank" rel="noreferrer" href="https://solscan.io/token/${mint.publicKey.toBase58()}">View on Solscan ↗</a><br><a target="_blank" rel="noreferrer" href="https://solscan.io/tx/${sig}">View transaction ↗</a>`;
  }catch(e){
    $('result').classList.remove('hidden'); $('result').textContent = e?.message || String(e);
  }finally{ $('create').disabled=false; $('create').textContent='Connect & create token'; }
}
$('create').onclick=createToken;

$('swap').onclick=()=>{
  const mint=$('mint').value.trim();
  if(!mint){alert('Paste a token mint address first.');return;}
  try{new PublicKey(mint);}catch{alert('Invalid Solana mint address.');return;}
  window.open(`https://jup.ag/swap/SOL-${mint}`,'_blank','noopener,noreferrer');
};

const demos=[['SOLCAT','$CAT','0.00021','+42%'],['MOONP','MOON','0.00183','+28%'],['FORGE','FRG','0.000094','+19%'],['DOGAI','DAI','0.00077','+13%'],['NOVA','NOVA','0.0041','+9%'],['BYTE','BYTE','0.00031','+7%']];
$('marketGrid').innerHTML=demos.map(([n,s,p,c])=>`<article class="market"><div class="avatar">${s[0]}</div><div class="mtext"><b>${n}</b><span>${s}</span></div><div class="price"><b>${p} SOL</b><span>${c}</span></div><button onclick="document.getElementById('mint').focus()">Trade</button></article>`).join('');
