/**
 * Capa HTTP: traduce la petición a una llamada al servicio y el resultado a una
 * respuesta con el código adecuado. No contiene reglas de negocio ni SQL.
 */
class TaskController {
  constructor(taskService) {
    this.service = taskService;
  }

  list = async (req, res) => {
    res.json(await this.service.listTasks());
  };

  create = async (req, res) => {
    const task = await this.service.createTask(req.body?.title);
    res.status(201).json(task);
  };

  updateStatus = async (req, res) => {
    const task = await this.service.updateTaskStatus(req.params.id, req.body?.done);
    res.json(task);
  };

  remove = async (req, res) => {
    await this.service.deleteTask(req.params.id);
    res.status(204).end();
  };
}

module.exports = { TaskController };
