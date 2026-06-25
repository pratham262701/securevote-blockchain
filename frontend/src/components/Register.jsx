import React, {useState} from 'react'
import { registerVoter } from '../api/backend'

const states = [
  { code: 'AP', name: 'Andhra Pradesh', cities: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 'Rajahmundry', 'Kakinada', 'Anantapur', 'Kadapa'] },
  { code: 'AR', name: 'Arunachal Pradesh', cities: ['Itanagar', 'Tawang', 'Naharlagun', 'Pasighat', 'Bomdila', 'Ziro', 'Along', 'Dibang Valley', 'Changlang', 'Miao'] },
  { code: 'AS', name: 'Assam', cities: ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Sivasagar', 'Tezpur', 'Bongaigaon', 'Duliajan', 'North Lakhimpur', 'Karbi Anglong'] },
  { code: 'BR', name: 'Bihar', cities: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur', 'Darbhanga', 'Purnia', 'Bihar Sharif', 'Katihar', 'Munger', 'Chhapra'] },
  { code: 'CG', name: 'Chhattisgarh', cities: ['Raipur', 'Bhilai', 'Bilaspur', 'Durg', 'Korba', 'Rajnandgaon', 'Ambikapur', 'Jagdalpur', 'Chirmiri', 'Dhamtari'] },
  { code: 'GA', name: 'Goa', cities: ['Panaji', 'Margao', 'Vasco da Gama', 'Panjim', 'Mapusa', 'Ponda', 'Bicholim', 'Sanquelim', 'Valpoi', 'Canacona'] },
  { code: 'GJ', name: 'Gujarat', cities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Morbi'] },
  { code: 'HR', name: 'Haryana', cities: ['Gurgaon', 'Faridabad', 'Rohtak', 'Panipat', 'Karnal', 'Hisar', 'Sonipat', 'Ambala', 'Yamunanagar', 'Kurukshetra'] },
  { code: 'HP', name: 'Himachal Pradesh', cities: ['Shimla', 'Mandi', 'Solan', 'Dharamshala', 'Kullu', 'Manali', 'Chamba', 'Hamirpur', 'Bilaspur', 'Una'] },
  { code: 'JH', name: 'Jharkhand', cities: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Hazaribagh', 'Deoghar', 'Giridih', 'Ramgarh', 'Phusro', 'Medininagar'] },
  { code: 'KA', name: 'Karnataka', cities: ['Bangalore', 'Mysore', 'Mangalore', 'Hubli', 'Dharwad', 'Belgaum', 'Bellary', 'Tumkur', 'Shimoga', 'Udupi'] },
  { code: 'KL', name: 'Kerala', cities: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Kannur', 'Alappuzha', 'Kottayam', 'Malappuram'] },
  { code: 'MP', name: 'Madhya Pradesh', cities: ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa'] },
  { code: 'MH', name: 'Maharashtra', cities: ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Navi Mumbai', 'Sangli'] },
  { code: 'MN', name: 'Manipur', cities: ['Imphal', 'Bishnupur', 'Thoubal', 'Ukhrul', 'Churachandpur', 'Kakching', 'Senapati', 'Tengnoupal', 'Jiribam', 'Nungba'] },
  { code: 'ML', name: 'Meghalaya', cities: ['Shillong', 'Tura', 'Jowai', 'Baghmara', 'Nongstoin', 'Williamnagar', 'Mawkyrwat', 'Khliehriat', 'Amlarem', 'Resubelpara'] },
  { code: 'MZ', name: 'Mizoram', cities: ['Aizawl', 'Lunglei', 'Champhai', 'Kolasib', 'Serchhip', 'Saitual', 'Hnahthial', 'Khawzawl', 'Zawlnuam', 'Bairabi'] },
  { code: 'NL', name: 'Nagaland', cities: ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha', 'Zunheboto', 'Mon', 'Phek', 'Kiphire', 'Longleng'] },
  { code: 'OD', name: 'Odisha', cities: ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore', 'Baripada', 'Bhadrak', 'Angul'] },
  { code: 'PB', name: 'Punjab', cities: ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur', 'Firozpur', 'Kapurthala', 'Moga'] },
  { code: 'RJ', name: 'Rajasthan', cities: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Pilani', 'Bhilwara', 'Alwar', 'Sikar'] },
  { code: 'SK', name: 'Sikkim', cities: ['Gangtok', 'Gyalshing', 'Namchi', 'Mangan', 'Rangpo', 'Soreng', 'Gyalshing', 'Pakyong', 'Gezing', 'Jorthang'] },
  { code: 'TN', name: 'Tamil Nadu', cities: ['Chennai', 'Coimbatore', 'Madurai', 'Trichy', 'Salem', 'Tirupur', 'Vellore', 'Erode', 'Tirunelveli', 'Dindigul'] },
  { code: 'TS', name: 'Telangana', cities: ['Hyderabad', 'Warangal', 'Secunderabad', 'Karimnagar', 'Khammam', 'Nizamabad', 'Ramagundam', 'Siddipet', 'Mahbubnagar', 'Suryapet'] },
  { code: 'TR', name: 'Tripura', cities: ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailasahar', 'Belonia', 'Khowai', 'Ambassa', 'Bishalgarh', 'Mohanpur', 'Sonamura'] },
  { code: 'UP', name: 'Uttar Pradesh', cities: ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Allahabad', 'Meerut', 'Aligarh', 'Bareilly', 'Moradabad', 'Gorakhpur'] },
  { code: 'UK', name: 'Uttarakhand', cities: ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur', 'Rishikesh', 'Nainital', 'Almora', 'Mussoorie'] },
  { code: 'WB', name: 'West Bengal', cities: ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Murshidabad', 'Malda', 'Baharampur', 'Habra', 'Kharagpur'] },
  { code: 'DL', name: 'Delhi', cities: ['New Delhi', 'North Delhi', 'South Delhi', 'East Delhi', 'West Delhi', 'Central Delhi', 'North East Delhi', 'North West Delhi', 'South West Delhi', 'South East Delhi'] },
  { code: 'CH', name: 'Chandigarh', cities: ['Chandigarh'] },
  { code: 'JK', name: 'Jammu and Kashmir', cities: ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Kathua', 'Udhampur', 'Pulwama', 'Kupwara', 'Poonch', 'Rajouri'] },
  { code: 'LD', name: 'Ladakh', cities: ['Leh', 'Kargil'] },
  { code: 'PY', name: 'Puducherry', cities: ['Puducherry', 'Karaikal', 'Mahe', 'Yanam'] },
  { code: 'AN', name: 'Andaman and Nicobar', cities: ['Port Blair', 'Car Nicobar', 'Havelock', 'Neil Kendra', 'Diglipur', 'Mayabunder', 'Rangat', 'Billy Ground'] },
  { code: 'DN', name: 'Dadra and Nagar Haveli', cities: ['Silvassa', 'Dadra', 'Naroli', 'Daman', 'Kachigam'] },
  { code: 'DD', name: 'Daman and Diu', cities: ['Daman', 'Diu'] },
  { code: 'LA', name: 'Lakshadweep', cities: ['Kavaratti', 'Agatti', 'Amini', 'Andrott', 'Kadmat', 'Kochi', 'Minicoy', 'Chetlat', 'Bitra', 'Bangaram'] }
];

export default function Register({address}){
  const [name, setName] = useState('')
  const [state, setState] = useState('')
  const [city, setCity] = useState('')
  const [status, setStatus] = useState(null)
  const submit = async ()=>{
    if(!address) return alert('connect wallet')
    if(!state) return alert('select state')
    if(!city) return alert('select city')
    try{
      const res = await registerVoter(address, name, null, name, '', null, state, city)
      setStatus('registered: '+res.voter_id)
    }catch(err){
      setStatus('err: '+ (err.response?.data || err.message))
    }
  }
  return (
    <div className="p-4 bg-white rounded shadow">
      <h3 className="font-medium">Register (via backend)</h3>
      <input className="mt-2 w-full p-2 border rounded" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} />
      <select className="mt-2 w-full p-2 border rounded" value={state} onChange={e=>{setState(e.target.value); setCity('')}}>
        <option value="">Select State</option>
        {states.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
      </select>
      <select className="mt-2 w-full p-2 border rounded" value={city} onChange={e=>setCity(e.target.value)} disabled={!state}>
        <option value="">Select City</option>
        {state && states.find(s => s.code === state)?.cities.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <div className="flex gap-2 mt-3">
        <button onClick={submit} className="px-3 py-1 rounded bg-green-600 text-white">Register</button>
        <div className="self-center text-sm text-slate-600">{status}</div>
      </div>
    </div>
  )
}