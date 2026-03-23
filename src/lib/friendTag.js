import { supabase } from './supabase.js'

const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const NUMBERS = '23456789'

export const generateFriendTag = () => {
  let letters = ''
  for (let i = 0; i < 4; i++) {
    letters += LETTERS[Math.floor(Math.random() * LETTERS.length)]
  }
  const num = NUMBERS[Math.floor(Math.random() * NUMBERS.length)]
  const pos = Math.floor(Math.random() * 5)
  return (letters.slice(0, pos) + num + letters.slice(pos)).toUpperCase()
}

export const ensureProfile = async (user) => {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('friend_tag, username')
      .eq('id', user.id)
      .single()

    if (!data?.friend_tag) {
      let tag = generateFriendTag()
      let exists = true
      while (exists) {
        const { data: check } = await supabase
          .from('profiles')
          .select('friend_tag')
          .eq('friend_tag', tag)
          .single()
        if (!check) exists = false
        else tag = generateFriendTag()
      }
      const username = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Orbiter'
      await supabase.from('profiles').upsert({
        id: user.id,
        friend_tag: tag,
        username,
        is_public: true,
        created_at: new Date().toISOString()
      })
      return tag
    }
    return data.friend_tag
  } catch (e) {
    console.warn('ensureProfile error:', e)
    return null
  }
}
