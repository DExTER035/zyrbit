const url = 'https://xgowpznkqbsngdiuodmj.supabase.co/rest/v1/friendships?select=*'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhnb3dwem5rcWJzbmdkaXVvZG1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjUyOTYsImV4cCI6MjA4OTY0MTI5Nn0.hmCDn6hrlVW1qaZbyFnToxKhSXXkGgxIf-bHTlWXavA'

async function check() {
  const res = await fetch(url, {
    headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
  })
  const json = await res.json()
  console.log('FRIENDSHIPS:')
  console.log(json)
  
  if (json.length > 0) {
    const r = json[0]
    const pUrl = `https://xgowpznkqbsngdiuodmj.supabase.co/rest/v1/profiles?id=in.(${r.requester_id},${r.addressee_id})&select=id,username,is_public`
    const pRes = await fetch(pUrl, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    })
    const pJson = await pRes.json()
    console.log('\nPROFILES INVOLVED:')
    console.log(pJson)
  }
}
check()
