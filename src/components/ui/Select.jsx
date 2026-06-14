<Select
  value={selectedSeller?.id || ''}
  onChange={e => { ... }}
  className="w-full md:w-1/2 bg-white text-black border border-gray-300 rounded-lg"
  //                       ^^^^^^^^^^
>
  <option value="" className="text-black">-- اختر بائعاً --</option>
  {sellerUsers.map(s => (
    <option key={s.id} value={s.id} className="text-black">
      {s.store_name || s.full_name} ({s.email})
    </option>
  ))}
</Select>

