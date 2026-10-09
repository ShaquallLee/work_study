---
title: JavaScript 基础
date: 2024-02-15
category: 编程
tags: [JavaScript, 前端, 入门]
description: JavaScript 语言的核心概念与基础语法讲解。
---

# JavaScript 基础

JavaScript 是一种轻量级、解释型的编程语言，是 Web 开发的三大核心技术之一。

## 变量声明

```javascript
// let 声明块级作用域变量
let name = 'Alice';

// const 声明常量
const PI = 3.14159;

// var（不推荐，函数作用域）
var oldStyle = 'legacy';
```

## 数据类型

JavaScript 有七种基本数据类型：

1. **String** - 字符串
2. **Number** - 数字
3. **Boolean** - 布尔值
4. **Undefined** - 未定义
5. **Null** - 空值
6. **Symbol** - 符号
7. **BigInt** - 大整数

以及引用类型：`Object`、`Array`、`Function` 等。

## 函数

### 函数声明

```javascript
function add(a, b) {
  return a + b;
}
```

### 箭头函数

```javascript
const multiply = (a, b) => a * b;
```

## 异步编程

Promise 是处理异步操作的重要方式：

```javascript
function fetchData() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ data: 'hello' });
    }, 1000);
  });
}

fetchData().then(result => console.log(result));
```

`async/await` 让异步代码更易读：

```javascript
async function main() {
  const result = await fetchData();
  console.log(result);
}
```

## 数组方法

常用的数组高阶函数：

- `map` - 映射转换
- `filter` - 过滤
- `reduce` - 聚合

```javascript
const numbers = [1, 2, 3, 4, 5];

const doubled = numbers.map(n => n * 2);
const evens = numbers.filter(n => n % 2 === 0);
const sum = numbers.reduce((acc, n) => acc + n, 0);
```

> 掌握这些基础概念，是深入学习 JavaScript 的第一步。
