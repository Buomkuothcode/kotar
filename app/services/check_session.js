

const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {

        router.replace('../screens/Welcome/welcome');
    }
};