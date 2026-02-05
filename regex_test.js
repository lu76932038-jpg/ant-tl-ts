
const imageRegex = /!\[(.*?)\]\((.*?)\)/g;

const testStrings = [
    "![image](/uploads/test.png)",
    "Some text\n![image](/uploads/test.png)\nMore text",
    "![image1](/uploads/1.png)![image2](/uploads/2.png)",
    "![image1](/uploads/1.png)\n![image2](/uploads/2.png)"
];

testStrings.forEach((content, idx) => {
    console.log(`\nCase ${idx + 1}:`);
    let match;
    let found = false;
    imageRegex.lastIndex = 0; // Reset for new string if strictly reusing same regex object pattern logic
    while ((match = imageRegex.exec(content)) !== null) {
        found = true;
        console.log(`Matched: Alt='${match[1]}', Src='${match[2]}'`);
    }
    if (!found) {
        console.log("No match found.");
    }
});
