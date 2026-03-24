import { useRouter } from 'expo-router';



export default function router(path) {
    const router = useRouter();
    router.replace(path)

}