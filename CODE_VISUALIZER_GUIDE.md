# 🎬 Code Visualizer - Complete Guide

## Overview

The **Code Visualizer** is a powerful new feature added to SkillXchange that allows you to see **animated, step-by-step visualizations** of how your code executes. Perfect for learning algorithms and understanding code flow!

---

## ✨ Features

### 1. **Real-time Code Animation**
- Watch your code execute step-by-step with beautiful animations
- See variables change in real-time
- Visual representation of data structures (arrays, strings, etc.)

### 2. **Supported Algorithms**
Currently supports visualization for:
- ✅ **Palindrome Checker** - See character-by-character comparison
- ✅ **Bubble Sort** - Watch elements swap and sort
- ✅ **Binary Search** - Visualize the search process
- ✅ **Factorial** - See multiplication steps
- ✅ **Fibonacci** - Watch the sequence build
- ✅ **Reverse String** - Character-by-character reversal
- ✅ **Sum of Array** - See running total

### 3. **Interactive Controls**
- ▶️ **Play/Pause** - Auto-play through steps
- ⏮️ **Step Backward** - Go to previous step
- ⏭️ **Step Forward** - Go to next step
- 🔄 **Reset** - Start visualization from beginning
- ⚡ **Speed Control** - Adjust animation speed (slider)

### 4. **Rich Visual Feedback**
- **Variables Panel** - Shows all active variables with their current values
- **Visual Display** - Animated representations (arrays, strings, etc.)
- **Execution Steps** - Detailed log of each step with descriptions

---

## 🚀 How to Use

### Step 1: Access the Visualizer
1. Open SkillXchange application
2. Click the **"Code Visualizer"** button in the header (purple button)
3. Or navigate directly to `code-visualizer.html`

### Step 2: Select or Write Code
**Option A - Use a Template:**
1. Click the "Select Template" dropdown at the top
2. Choose an algorithm (e.g., "Palindrome Checker")
3. The code editor will auto-fill with example code

**Option B - Write Your Own:**
1. Write JavaScript code in the Monaco editor
2. Currently optimized for algorithm visualization

### Step 3: Run the Visualization
1. Click **"Run & Visualize"** button
2. The system analyzes your code and generates animation steps
3. Visualization appears in the right panel

### Step 4: Control the Animation
- Click **Play** to auto-advance through steps
- Use **Step Forward/Backward** for manual control
- Adjust **Speed Slider** to make it faster or slower
- Click **Reset** to start over

---

## 📝 Example: Palindrome Checker

### Code:
```javascript
function palindrome(str) {
    let left = 0;
    let right = str.length - 1;
    
    while (left < right) {
        if (str[left] !== str[right]) {
            return false;
        }
        left++;
        right--;
    }
    return true;
}

const result = palindrome("racecar");
console.log("Is palindrome:", result);
```

### What You'll See:
1. **Initial State**: String "racecar" displayed with all characters
2. **Step 1**: Characters at positions 0 and 6 highlighted (comparing 'r' and 'r')
3. **Step 2**: Match confirmed, moving to next pair
4. **Step 3**: Comparing positions 1 and 5 ('a' and 'a')
5. **... continues until complete**
6. **Final**: Success message showing it's a palindrome ✓

### Variables Panel Shows:
```
str: "racecar"
left: 0 → 1 → 2 → 3
right: 6 → 5 → 4 → 3
result: true
```

---

## 🎨 Visual Elements Explained

### Color Coding

| Color | Meaning |
|-------|---------|
| 🔵 Blue | Normal/initial state |
| 🟡 Yellow | Currently comparing/active |
| 🟢 Green | Match found/sorted/success |
| 🔴 Red | Mismatch/error |
| 🟣 Purple | Highlight/selected |

### Animation Types

**Pulse Animation**: Elements being actively compared or processed

**Slide In**: New variables or steps appearing

**Highlight**: Current execution line or focus area

---

## 🔧 Technical Implementation

### Architecture

The visualizer uses:
- **Monaco Editor** - Professional code editing
- **Custom Animation Engine** - Step-by-step execution tracking
- **Dynamic Visualization Generator** - Converts code into visual steps
- **Tailwind CSS** - Beautiful, responsive UI

### How It Works

1. **Code Analysis**: When you click "Run", the system parses your code
2. **Step Generation**: Creates a series of visualization steps
3. **State Tracking**: Tracks variables and their changes
4. **Visual Rendering**: Generates HTML/CSS for each step
5. **Playback**: Allows you to navigate through steps

### Code Structure

```javascript
visualizationSteps = [
  {
    line: 1,                    // Line number being executed
    description: "...",         // What's happening
    variables: {...},           // Current variable states
    visual: "<html>..."        // Visual representation
  },
  // ... more steps
]
```

---

## 📚 Adding Custom Algorithms

To add your own algorithm visualization:

### 1. Add Template (Optional)
```javascript
// In code-visualizer.html, find the templates object
const templates = {
    myAlgorithm: `function myAlgorithm() {
        // Your code here
    }`
};
```

### 2. Add to Dropdown
```html
<option value="myAlgorithm">My Algorithm</option>
```

### 3. Create Visualization Generator
```javascript
function generateMyAlgorithmVisualization(code) {
    // Parse inputs from code
    // Create steps array
    visualizationSteps.push({
        line: 1,
        description: "Step description",
        variables: { ... },
        visual: createMyVisualization(...)
    });
}
```

### 4. Add to Analyzer
```javascript
function analyzeCode(code) {
    if (code.includes('myAlgorithm')) {
        generateMyAlgorithmVisualization(code);
    }
    // ... existing code
}
```

---

## 🎯 Use Cases

### For Students:
- 📖 **Learning Algorithms** - Understand how sorting, searching work
- 🔍 **Debugging** - See exactly where code goes wrong
- 📝 **Exam Prep** - Visualize algorithm steps for better retention

### For Teachers:
- 🎓 **Teaching Aid** - Show students how code executes
- 💡 **Demonstrations** - Live coding with visual feedback
- ✅ **Assessment** - Students can verify their understanding

### For Developers:
- 🐛 **Problem Solving** - Trace through complex logic
- 📊 **Optimization** - Identify inefficient steps
- 🎨 **Presentations** - Show code execution beautifully

---

## 🚀 Future Enhancements

Planned features:
- [ ] More algorithms (QuickSort, Merge Sort, DFS, BFS)
- [ ] Recursive call stack visualization
- [ ] Tree and graph visualizations
- [ ] Custom data structure support
- [ ] Export animation as video/GIF
- [ ] Collaborative visualization (share with others)
- [ ] Code complexity analysis
- [ ] Multi-language support (Python, Java, C++)

---

## 🐛 Troubleshooting

### Problem: Visualization doesn't start
**Solution**: Ensure you've selected a template or your code matches a supported algorithm pattern

### Problem: Steps seem incorrect
**Solution**: The visualizer simulates execution. Complex code may need custom visualization logic

### Problem: Animation is too fast/slow
**Solution**: Use the speed slider at the top of the visualization panel

### Problem: Controls are disabled
**Solution**: Click "Run & Visualize" first to generate steps

---

## 🎨 Customization

### Changing Colors
Edit the CSS classes in `code-visualizer.html`:
```css
.array-item.active {
    background: linear-gradient(135deg, #YOUR_COLOR, #YOUR_COLOR_2);
}
```

### Adjusting Speed Range
Modify the speed control:
```html
<input type="range" id="speedControl" 
       min="100" max="2000" value="1000">
```

### Custom Visual Components
Create your own visualization functions:
```javascript
function createMyCustomVisualization(data) {
    return `<div class="custom-visual">
        ${/* your HTML */}
    </div>`;
}
```

---

## 📞 Support

For questions or issues:
- 📧 Email: support@skillxchange.com
- 💬 Discord: [SkillXchange Community]
- 🐛 GitHub Issues: [Report a Bug]

---

## 📜 License

Part of the SkillXchange platform. See LICENSE file for details.

---

## 🙏 Credits

**Developed for SkillXchange**
- Uses Monaco Editor (Microsoft)
- Tailwind CSS for styling
- Font Awesome for icons

---

**Happy Coding & Visualizing! 🎉**
