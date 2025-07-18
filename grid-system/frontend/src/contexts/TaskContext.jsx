import React, { createContext, useContext, useState, useEffect } from 'react';

const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
    const [sentTasks, setSentTasks] = useState(() => {
        const savedTasks = localStorage.getItem('sentTasks');
        return savedTasks ? JSON.parse(savedTasks) : [];
    });

    useEffect(() => {
        console.log('Saving sentTasks to localStorage:', sentTasks);
        localStorage.setItem('sentTasks', JSON.stringify(sentTasks));
    }, [sentTasks]);

    const addTask = (task) => {
        setSentTasks(prev => [...prev, task]);
    };

    const toggleTask = (index) => {
        setSentTasks(prev => {
            const newTasks = [...prev];
            const taskToUpdate = { ...newTasks[index] };
            taskToUpdate.completed = !taskToUpdate.completed;
            newTasks[index] = taskToUpdate;
            return newTasks;
        });
    };

    const removeTask = (index) => {
        setSentTasks(prev => prev.filter((_, i) => i !== index));
    };

    return (
        <TaskContext.Provider value={{ sentTasks, addTask, toggleTask, removeTask }}>
            {children}
        </TaskContext.Provider>
    );
};

export const useTasks = () => {
    const context = useContext(TaskContext);
    if (context === undefined) {
        throw new Error('useTasks must be used within a TaskProvider');
    }
    return context;
};