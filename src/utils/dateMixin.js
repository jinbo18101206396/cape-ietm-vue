export default {
    methods: {
        getYear() {
            const newDate = new Date();
            return String(newDate.getFullYear());
        },
        getMonth() {
            const newDate = new Date();
            return newDate.getMonth() + 1;
        }
    }
}
