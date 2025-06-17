// Department Controller - Handles department-related operations

// In departmentController.js
exports.getDepartments = async (req, res) => {
    try {
        const db = req.app.get('db');
        console.log('Database connection in controller:', db ? 'Connected' : 'Not connected');
        
        const [departments] = await db.query('SELECT * FROM departments');
        console.log('Departments from DB:', departments);
        
        res.json({ 
            success: true, 
            data: departments 
        });
    } catch (error) {
        console.error('Error in getDepartments:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch departments',
            error: error.message 
        });
    }
};

// In your department management component
exports.createDepartment = async (req, res) => {
  let connection;
  try {
    const db = req.app.get('db');
    connection = await db.getConnection();
    
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Department name is required' 
      });
    }

    // Insert the new department
    const [result] = await connection.query(
      'INSERT INTO departments (name, description) VALUES (?, ?)',
      [name, description || null]
    );

    // Get the newly created department
    const [newDept] = await connection.query(
      'SELECT * FROM departments WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ 
      success: true, 
      data: newDept[0] 
    });

  } catch (error) {
    console.error('Error in createDepartment:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage
    });

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ 
        success: false, 
        message: 'Department with this name already exists' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Error creating department',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};

exports.updateDepartment = async (req, res) => {
  let connection;
  try {
    const db = req.app.get('db');
    if (!db) {
      console.error('Database connection not found in app settings');
      return res.status(500).json({
        success: false,
        message: 'Database connection error',
        error: 'Database connection not initialized'
      });
    }

    connection = await db.getConnection();
    const { id } = req.params;
    const { name, description } = req.body;

   

    // Update the department without checking for duplicates
    await connection.query(
      'UPDATE departments SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );

    // Get the updated department
    const [updatedDept] = await connection.query(
      'SELECT * FROM departments WHERE id = ?',
      [id]
    );

    res.json({ 
      success: true, 
      data: updatedDept[0] 
    });

  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating department',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};

exports.deleteDepartment = async (req, res) => {
  let connection;
  try {
    const db = req.app.get('db');
    if (!db) {
      console.error('Database connection not found in app settings');
      return res.status(500).json({
        success: false,
        message: 'Database connection error',
        error: 'Database connection not initialized'
      });
    }

    connection = await db.getConnection();
    const { id } = req.params;
    
    // First, check if the department exists
    const [department] = await connection.query('SELECT * FROM departments WHERE id = ?', [id]);
    if (department.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Department not found' 
      });
    }

    // Check if the department is being referenced by other tables
    try {
      await connection.beginTransaction();
      
      // Try to delete
      const [result] = await connection.query('DELETE FROM departments WHERE id = ?', [id]);
      
      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ 
          success: false, 
          message: 'Department not found' 
        });
      }
      
      await connection.commit();
      
      res.json({ 
        success: true, 
        message: 'Department deleted successfully' 
      });
      
    } catch (error) {
      await connection.rollback();
      
      if (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete department because it is being used by other records',
          error: 'Department is in use'
        });
      }
      
      throw error; // Re-throw other errors
    }
    
  } catch (error) {
    console.error('Error deleting department:', {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting department',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    if (connection) {
      await connection.release();
    }
  }
};