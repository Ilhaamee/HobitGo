import { ref, watch } from 'vue'
import { supabase } from '../lib/supabase'

const isDark = ref(false)

export function useTheme() {
    function applyTheme(dark) {
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    }

    async function loadTheme() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data } = await supabase.from('profiles').select('dark_mode').eq('id', user.id).single()
        if (data) {
            isDark.value = data.dark_mode || false
            applyTheme(isDark.value)
        }
    }

    async function toggleTheme() {
        isDark.value = !isDark.value
        applyTheme(isDark.value)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            await supabase.from('profiles').update({ dark_mode: isDark.value }).eq('id', user.id)
        }
    }

    return { isDark, loadTheme, toggleTheme }
}