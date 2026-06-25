import React, {useState, useEffect} from 'react'
import { connectWallet } from '../utils/web3'

export default function ConnectWallet({address, setAddress}){
  const [short, setShort] = useState('')
  useEffect(()=>{
    if(address) setShort(address.slice(0,6) + '...' + address.slice(-4))
  },[address])

  async function handle(){
    try{
      const { address: addr } = await connectWallet()
      setAddress(addr)
    }catch(e){
      alert(e.message)
    }
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded shadow">
      <div>
        <div className="text-sm text-slate-500">Connected Wallet</div>
        <div className="font-mono text-sm">{address ? short : 'Not connected'}</div>
      </div>
      <div>
        <button className="px-3 py-1 rounded bg-sky-600 text-white" onClick={handle}>{address ? 'Reconnect' : 'Connect MetaMask'}</button>
      </div>
    </div>
  )
}