const uid = {
    randomUUID: (length: number) => {
        let result = "";
        while (result.length < length) {
            result += Math.random().toString(36).substring(2);
        }
        return result.substring(0, length);
    }
}

export default uid